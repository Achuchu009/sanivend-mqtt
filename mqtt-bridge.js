require('dotenv').config();
const mqtt = require('mqtt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost';
const client = mqtt.connect(brokerUrl);

// Topics
const TOPIC_STOCK_REQUEST = 'vending/stock/request';
const TOPIC_STOCK_RESPONSE = 'vending/stock/response';
const TOPIC_DISPENSE = 'vending/dispense';
const TOPIC_DISPENSE_RESPONSE = 'vending/dispense/response';
const TOPIC_SALES = 'sanivend/sales';
const TOPIC_ERRORS = 'sanivend/errors';
const TOPIC_STATUS = 'vending/status';
const TOPIC_HEARTBEAT = 'vending/heartbeat';
const TOPIC_AUTH_REQ = 'sanivend/auth/req';
const TOPIC_AUTH_RES = 'sanivend/auth/res';

const TOPIC_RESTOCK = 'vending/admin/restock';

// --- WATCHDOG VARIABLES ---
let lastHeartbeatTime = Date.now();
let isMachineOffline = false;
let firstHeartbeatReceived = false;

client.on('connect', () => {
  console.log('✅ MQTT Bridge Connected');

  // Mag-subscribe na rin sa TOPIC_HEARTBEAT
  client.subscribe([
    TOPIC_STOCK_REQUEST, TOPIC_DISPENSE, TOPIC_SALES,
    TOPIC_ERRORS, TOPIC_STATUS, TOPIC_AUTH_REQ, TOPIC_HEARTBEAT, TOPIC_RESTOCK
  ]);

  // START THE WATCHDOG TIMER
  setInterval(checkConnectionStatus, 5000); // Check every 5 seconds
});

// --- WATCHDOG FUNCTION ---
async function checkConnectionStatus() {
  const timeSinceLastBeat = Date.now() - lastHeartbeatTime;
  const TIMEOUT_LIMIT = 60000; // 60 Seconds timeout (increased to handle 45s LCD pauses)

  if (timeSinceLastBeat > TIMEOUT_LIMIT && !isMachineOffline) {
    // TIMEOUT REACHED! Machine is gone.
    console.log("🚨 ALERT: Machine Heartbeat Lost! Logging Error...");
    isMachineOffline = true;

    try {
      await prisma.systemLogs.create({
        data: {
          errorCode: "NET_01",
          message: "Machine Offline / Disconnected",
          status: "Open"
        }
      });
      console.log("⚠️ Database Updated: NET_01 Logged.");
    } catch (err) {
      console.error("Error logging offline status:", err);
    }
  }
}

client.on('message', async (topic, message) => {
  const payload = message.toString();

  // ---------------------------------------------------------
  // CASE 0: HEARTBEAT RECEIVED (Reset Timer & Auto-Resolve)
  // ---------------------------------------------------------
  // UPDATED: Reset timer for ANY message from the machine to prevent false offline statuses
  // when the machine is busy displaying an error or dispensing and misses a heartbeat.
  const machineTopics = [
    TOPIC_STATUS, TOPIC_HEARTBEAT, TOPIC_ERRORS,
    TOPIC_SALES, TOPIC_DISPENSE, TOPIC_STOCK_REQUEST, TOPIC_AUTH_REQ
  ];

  if (machineTopics.includes(topic)) {
    lastHeartbeatTime = Date.now(); // Reset timer

    if (isMachineOffline || !firstHeartbeatReceived) {
      if (isMachineOffline) {
        console.log("✅ Machine Reconnected! Auto-resolving NET_01...");
      } else {
        console.log("✅ First Heartbeat Received! Auto-resolving any dangling NET_01...");
      }
      isMachineOffline = false;
      firstHeartbeatReceived = true;

      // AUTO-RESOLVE: Mark 'NET_01' as Resolved in Database
      try {
        await prisma.systemLogs.updateMany({
          where: {
            errorCode: 'NET_01',
            status: 'Open'
          },
          data: { status: 'Resolved' }
        });
        console.log("✅ Database Updated: Machine marked Online.");
      } catch (err) {
        console.error("Error resolving offline status:", err);
      }
    }

    // Kung heartbeat lang, return na (wag na i-parse as JSON kung di kailangan)
    if (topic === TOPIC_HEARTBEAT || topic === TOPIC_STATUS) return;
  }

  // console.log(`\n📩 Received on ${topic}: ${payload}`); // Uncomment kung gusto mo makita lahat ng logs

  try {
    const data = JSON.parse(payload);

    // CASE 1: AUTH
    if (topic === TOPIC_AUTH_REQ) {
      const { uid } = data;
      console.log(`🔍 Validating Card: ${uid}`);
      const card = await prisma.rFIDCard.findUnique({ where: { uid: uid } });
      const response = {
        uid: uid,
        isValid: !!card,
        balance: card ? parseFloat(card.balance) : 0.0,
        owner: card ? card.owner : "Unknown"
      };
      client.publish(TOPIC_AUTH_RES, JSON.stringify(response));
      console.log(`📤 Sent Auth Response: ${response.isValid ? "Valid" : "Invalid"}`);
    }

    // CASE 2: STOCK REQUEST
    if (topic === TOPIC_STOCK_REQUEST) {
      const { slotId } = data;
      const cleanSlotId = slotId ? slotId.trim() : "";
      const item = await prisma.inventory.findUnique({ where: { slotId: cleanSlotId } });
      if (item) {
        const response = JSON.stringify({
          slotId: item.slotId,
          stock: item.stock,
          price: Number(item.unitPrice)
        });
        client.publish(TOPIC_STOCK_RESPONSE, response);
        // console.log(`📤 Sent Stock Update: ${response}`);
      }
    }

    // CASE 3: DISPENSE
    if (topic === TOPIC_DISPENSE) {
      const { slotId, quantity, quantity_dispensed } = data;
      // Hardware now sends quantity_dispensed. Fallback to quantity or 1 for backward compatibility.
      const qty = quantity_dispensed !== undefined ? quantity_dispensed : (quantity || 1);
      const cleanSlotId = slotId.trim();
      const updatedItem = await prisma.inventory.update({
        where: { slotId: cleanSlotId },
        data: { stock: { decrement: qty } }
      });
      const response = JSON.stringify({ success: true, slotId: cleanSlotId, newStock: updatedItem.stock });
      client.publish(TOPIC_DISPENSE_RESPONSE, response);
      console.log(`📉 Stock Updated: ${cleanSlotId} decremented by ${qty}. Total is now ${updatedItem.stock}`);
    }

    // CASE 4: SALES
    if (topic === TOPIC_SALES) {
      const { amount, paymentMethod, slotId, itemName, quantity, quantity_dispensed, cardUid, newBalance } = data;
      const qty = quantity_dispensed !== undefined ? quantity_dispensed : (quantity || 1);
      await prisma.sales.create({
        data: {
          amount: parseFloat(amount),
          paymentMethod: paymentMethod,
          slotId: slotId,
          itemName: itemName,
          quantity: qty,
          cardUid: cardUid || null
        }
      });
      console.log(`💰 Sale Saved: Php ${amount} for ${qty} item(s)`);

      if (paymentMethod === 'RFID' && cardUid && newBalance !== undefined) {
        try {
          await prisma.rFIDCard.update({
            where: { uid: cardUid },
            data: { balance: parseFloat(newBalance), lastUsed: new Date() }
          });
          console.log(`💳 Database Balance Updated`);
        } catch (err) { console.log(`⚠️ Card not found`); }
      }
    }

    // CASE 5: ERRORS
    if (topic === TOPIC_ERRORS) {
      const { errorCode, message, status } = data;
      await prisma.systemLogs.create({
        data: { errorCode, message, status }
      });
      console.log(`⚠️ Error Logged: ${message}`);
    }

    // CASE 6: RESTOCK (Admin Action)
    if (topic === TOPIC_RESTOCK) {
      const { slotId, addedStock, newTotal } = data;
      const cleanSlotId = slotId.trim();

      try {
        const updatedItem = await prisma.inventory.update({
          where: { slotId: cleanSlotId },
          data: { stock: newTotal }
        });
        console.log(`🔄 Restock Updated: ${cleanSlotId} added ${addedStock}. Total is now ${updatedItem.stock}`);
      } catch (err) {
        console.error(`Error updating stock for restock:`, err);
      }
    }
  } catch (err) {
    // console.error("❌ Error processing message:", err);
  }
});