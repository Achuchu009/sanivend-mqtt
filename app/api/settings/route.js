import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import mqtt from 'mqtt';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const sessionToken = req.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    
    if (!settings) {
      // Return default values if the DB is completely empty
      return NextResponse.json({
        machineConfig: { machineName: 'SANIVEND Unit 01', location: 'Building A, Floor 2', ssid: '', wifiPassword: '', serverIp: '' },
        thresholds: { slot1: 5, slot2: 3, slot3: 3, slot4: 3 },
        notifications: { lowStock: true, errors: true, popup: true }
      });
    }

    // Map the database fields to the structure expected by the frontend
    return NextResponse.json({
      machineConfig: {
        machineName: settings.machineName, location: settings.location,
        ssid: settings.ssid, wifiPassword: settings.wifiPassword, serverIp: settings.serverIp
      },
      thresholds: {
        slot1: settings.slot1Threshold, slot2: settings.slot2Threshold,
        slot3: settings.slot3Threshold, slot4: settings.slot4Threshold
      },
      notifications: {
        lowStock: settings.lowStockAlerts, errors: settings.errorAlerts, popup: settings.showPopup
      }
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sessionToken = req.cookies.get('admin_session');
    if (!sessionToken || sessionToken.value !== process.env.SERVER_RUN_ID) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body;

    // Ensure a settings record exists to update (ID 1)
    let currentSettings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!currentSettings) {
      currentSettings = await prisma.systemSettings.create({ data: { id: 1 } });
    }

    if (type === 'account') {
      // Find the admin user (assume ID 1)
      let admin = await prisma.admin.findUnique({ where: { id: 1 } });
      
      // If no admin exists yet (e.g., fresh database), create a default one (admin / admin)
      if (!admin) {
        const defaultHash = await bcrypt.hash('admin', 10);
        admin = await prisma.admin.create({ data: { id: 1, username: 'admin', password: defaultHash } });
      }

      // Verify the current password
      const isPasswordValid = await bcrypt.compare(data.currentPassword, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json({ success: false, error: 'Incorrect current password!' }, { status: 401 });
      }

      // Hash the new password and update the database
      const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);
      await prisma.admin.update({
        where: { id: 1 },
        data: { username: data.username, password: hashedNewPassword }
      });
      console.log('Account settings updated successfully.');
    } 
    else if (type === 'machine') {
      await prisma.systemSettings.update({
        where: { id: 1 },
        data: {
          machineName: data.machineName,
          location: data.location,
          ssid: data.ssid,
          wifiPassword: data.wifiPassword,
          serverIp: data.serverIp
        }
      });

      // ---------------------------------------------------------
      // ✨ MQTT INTEGRATION FOR ESP32 WIFI CREDENTIALS ✨
      // Sends the new WiFi and Server configuration to the machine
      // ---------------------------------------------------------
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost';
      const client = mqtt.connect(brokerUrl); 
      client.on('connect', () => {
        client.publish('vending/admin/config', JSON.stringify({
          ssid: data.ssid,
          password: data.wifiPassword,
          serverIp: data.serverIp
        }));
        client.end(); // Always safely close the connection
      });
    } 
    else if (type === 'thresholds') {
      // Validate limits against inventory max capacities
      const inventory = await prisma.inventory.findMany();
      for (const item of inventory) {
        if (item.slotId === 'slot1' && data.slot1 > item.maxCapacity) {
          return NextResponse.json({ success: false, error: `Slot 1 threshold cannot exceed max capacity (${item.maxCapacity})` }, { status: 400 });
        }
        if (item.slotId === 'slot2' && data.slot2 > item.maxCapacity) {
          return NextResponse.json({ success: false, error: `Slot 2 threshold cannot exceed max capacity (${item.maxCapacity})` }, { status: 400 });
        }
        if (item.slotId === 'slot3' && data.slot3 > item.maxCapacity) {
          return NextResponse.json({ success: false, error: `Slot 3 threshold cannot exceed max capacity (${item.maxCapacity})` }, { status: 400 });
        }
        if (item.slotId === 'slot4' && data.slot4 > item.maxCapacity) {
          return NextResponse.json({ success: false, error: `Slot 4 threshold cannot exceed max capacity (${item.maxCapacity})` }, { status: 400 });
        }
      }

      await prisma.systemSettings.update({
        where: { id: 1 },
        data: {
          slot1Threshold: data.slot1,
          slot2Threshold: data.slot2,
          slot3Threshold: data.slot3,
          slot4Threshold: data.slot4
        }
      });
    }
    else if (type === 'notifications') {
      await prisma.systemSettings.update({
        where: { id: 1 },
        data: {
          lowStockAlerts: data.lowStock,
          errorAlerts: data.errors,
          showPopup: data.popup
        }
      });
    }

    return NextResponse.json({ success: true, message: `${type} settings updated.` });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ success: false, error: 'Failed to update settings.' }, { status: 500 });
  }
}