// app/register-card/page.js
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import styles from './register.module.css';
import useSWR, { mutate } from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// --- SVG ICONS ---
const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);
const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);
const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
const SuccessIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2A9D8F' }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);
const ErrorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E63946' }}>
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);
const InfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#457B9D' }}>
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export default function RegisterCardPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    // --- ADDED UI STATES ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, uid: null });

    const [uid, setUid] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [initialLoad, setInitialLoad] = useState('');

    const [isConnected, setIsConnected] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [justRegistered, setJustRegistered] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    // Tracks whether we are currently writing the initial balance to the card chip
    const [isWritingCard, setIsWritingCard] = useState(false);

    const portRef = useRef(null);
    const writerRef = useRef(null);           // serial writer — needed to send SET: commands
    const readerRef = useRef(null);
    const readableClosedRef = useRef(null);   // pipeTo promise — must await before port.close()
    const writableClosedRef = useRef(null);   // pipeTo promise — must await before port.close()
    const isReadingRef = useRef(false);
    const isWritingCardRef = useRef(false);   // ref mirror so the serial loop can read it
    const pendingSetBalanceRef = useRef(null);
    const lastSeenRef = useRef(0);
    const processedRef = useRef('');          // cleared by watchdog to trigger re-check
    const lastUidRef = useRef('');            // persists after removal — used to detect genuinely new cards

    const { data: recentCards } = useSWR('/api/rfid?type=recent', fetcher, { refreshInterval: 2000 });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCards = Array.isArray(recentCards) ? recentCards.filter(card => {
        const query = searchQuery.toLowerCase();
        const dateStr = new Date(card.lastLoaded).toLocaleDateString().toLowerCase();
        return !searchQuery ||
            (card.owner && card.owner.toLowerCase().includes(query)) ||
            (card.uid && card.uid.toLowerCase().includes(query)) ||
            (dateStr.includes(query));
    }) : [];

    const maskUid = (rawUid) => {
        if (!rawUid) return "********";
        return `*******${rawUid.slice(-4)}`;
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // --- EDIT FUNCTIONS ---
    const startEditing = (card) => {
        setEditingId(card.id);
        setEditName(card.owner);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = async (id) => {
        try {
            const res = await fetch('/api/rfid', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, owner: editName })
            });
            if (res.ok) {
                setEditingId(null);
                mutate('/api/rfid?type=recent');
                showToast("Name updated successfully!", "success");
            }
        } catch (err) {
            console.error("Update Failed", err);
            showToast("Failed to update name.", "error");
        }
    };

    // --- CUSTOM DELETE FUNCTIONS ---
    const initiateDelete = (id, cardUid) => {
        setDeleteModal({ show: true, id, uid: cardUid });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        const deletedUid = deleteModal.uid;
        try {
            const res = await fetch('/api/rfid', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                mutate('/api/rfid?type=recent');
                showToast("Card deleted permanently.", "success");

                // If the deleted card is currently on the scanner, zero its chip
                // so it can no longer be used at the vending machine or Top-Up page.
                if (writerRef.current && deletedUid && deletedUid === uid) {
                    try {
                        await writerRef.current.write('SET:0\n');
                        // Reset the scanner UI so the card now appears as unregistered
                        setUid('');
                        setOwnerName('');
                        setInitialLoad('');
                        setIsRegistered(false);
                        processedRef.current = '';
                        lastUidRef.current = '';
                    } catch (writeErr) {
                        console.error('Failed to zero card chip:', writeErr);
                    }
                }
            } else {
                showToast("Failed to delete card.", "error");
            }
        } catch (err) {
            console.error("System Error", err);
            showToast("System error occurred.", "error");
        } finally {
            setDeleteModal({ show: false, id: null, uid: null });
        }
    };

    // WATCHDOG TIMER — fires when no DATA| has been received for 2 seconds,
    // meaning the card has been genuinely removed (not just in the RC522's
    // 500ms halt/wakeup cycle). Clears all form state so the UI resets.
    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastSeenRef.current > 2000 && uid) {
                setUid('');
                setOwnerName('');
                setInitialLoad('');
                setIsRegistered(false);
                setJustRegistered(false);
                processedRef.current = '';
                // Note: lastUidRef is intentionally NOT cleared here.
                // It lets checkIfRegistered know the card that just left,
                // so when the SAME card comes back it won't wipe the typed fields.
            }
        }, 500);
        return () => clearInterval(interval);
    }, [uid]);

    // CORE SERIAL LOGIC
    const startReading = async (port) => {
        if (isReadingRef.current) return;
        isReadingRef.current = true;

        try {
            // If the port is still open from a previous page (race condition during navigation),
            // wait up to 1 second for it to close before attempting to open it.
            if (port.readable !== null) {
                let waited = 0;
                while (port.readable !== null && waited < 1000) {
                    await new Promise(r => setTimeout(r, 100));
                    waited += 100;
                }
            }
            if (port.readable !== null) {
                // Port still won't close — bail out so we don't crash
                isReadingRef.current = false;
                showToast("Port busy. Try clicking 'Not Connected'.", "error");
                return;
            }

            await port.open({ baudRate: 115200 });
            portRef.current = port;
            setIsConnected(true);
            showToast("Scanner Connected", "success");

            // Set up writer so we can send SET: commands to the Arduino
            const textEncoder = new TextEncoderStream();
            writableClosedRef.current = textEncoder.readable.pipeTo(port.writable);
            writerRef.current = textEncoder.writable.getWriter();

            const textDecoder = new TextDecoderStream();
            readableClosedRef.current = port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    isReadingRef.current = false;
                    break;
                }
                if (value) {
                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    for (const line of lines) {
                        const cleanLine = line.trim();

                        if (cleanLine.startsWith("DATA|")) {
                            const parts = cleanLine.split('|');
                            if (parts.length >= 3) {
                                const scannedUid = parts[1];
                                const scannedBal = parseFloat(parts[2]);
                                lastSeenRef.current = Date.now();

                                // ── CONFIRM WRITE ───────────────────────────────────────
                                // After we send SET:, the Arduino replies with DATA| once
                                // the write is confirmed. Catch that here.
                                if (isWritingCardRef.current) {
                                    isWritingCardRef.current = false;
                                    pendingSetBalanceRef.current = null;
                                    setIsWritingCard(false);
                                    showToast(`Card written! Balance: ₱${scannedBal.toFixed(2)}`, "success");
                                    // Re-check DB so the UI shows "registered" state
                                    processedRef.current = scannedUid;
                                    setUid(scannedUid);
                                    checkIfRegistered(scannedUid);
                                    continue; // skip the new-card detection below
                                }
                                // ────────────────────────────────────────────────────────

                                if (scannedUid !== processedRef.current) {
                                    processedRef.current = scannedUid;
                                    setUid(scannedUid);
                                    checkIfRegistered(scannedUid);
                                }
                            }
                        }

                        // Arduino sends ERROR: if the write failed (card removed too early)
                        if (cleanLine.startsWith("ERROR:")) {
                            if (isWritingCardRef.current) {
                                isWritingCardRef.current = false;
                                pendingSetBalanceRef.current = null;
                                setIsWritingCard(false);
                                showToast("Card write failed! Hold the card steady and try again.", "error");
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Reader Error:", err);
            setIsConnected(false);
            isReadingRef.current = false;
        }
    };

    const checkIfRegistered = async (scannedUid) => {
        setJustRegistered(false);

        // Only clear the typed fields if this is a GENUINELY DIFFERENT card.
        // When the same card returns after its RC522 halt/wakeup cycle,
        // lastUidRef still holds the previous UID — so we skip the clear
        // and the admin keeps whatever they typed. If it really is a new card,
        // we wipe the form so they get a blank slate.
        if (scannedUid !== lastUidRef.current) {
            setOwnerName('');
            setInitialLoad('');
        }
        lastUidRef.current = scannedUid;

        try {
            const res = await fetch(`/api/rfid?uid=${scannedUid}`);
            if (res.ok) {
                const data = await res.json();
                setIsRegistered(true);
                setOwnerName(data.owner);
                setInitialLoad(data.balance);
            } else {
                setIsRegistered(false);
            }
        } catch (err) { console.error(err); }
    };

    const handleRegister = async () => {
        if (!uid || !ownerName || !initialLoad) return;

        try {
            const res = await fetch('/api/rfid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, owner: ownerName, initialBalance: initialLoad })
            });

            if (res.ok) {
                setIsRegistered(true);
                setJustRegistered(true);
                mutate('/api/rfid?type=recent');
                setTimeout(() => setJustRegistered(false), 3000);

                // ── WRITE INITIAL BALANCE TO THE PHYSICAL CARD CHIP ─────────────
                // The DB now has the correct balance, but we MUST also overwrite
                // the physical card chip so it matches. Without this step, the
                // old balance on the chip is what the vending machine will read.
                if (writerRef.current) {
                    try {
                        isWritingCardRef.current = true;
                        pendingSetBalanceRef.current = parseFloat(initialLoad);
                        setIsWritingCard(true);
                        showToast("Writing balance to card... DO NOT REMOVE", "info");
                        await writerRef.current.write(`SET:${initialLoad}\n`);
                    } catch (writeErr) {
                        console.error("Serial write failed:", writeErr);
                        isWritingCardRef.current = false;
                        setIsWritingCard(false);
                        showToast("Registered in DB but card write failed. Use Top-Up to sync the card.", "error");
                    }
                } else {
                    // No scanner connected — DB saved but card chip not updated yet
                    showToast("Card registered! Connect scanner & use Top-Up to write balance to card.", "success");
                }
                // ────────────────────────────────────────────────────────────────
            } else {
                const errData = await res.json();
                showToast(errData.error || "Registration failed.", "error");
            }
        } catch (err) {
            console.error("System Error", err);
            showToast("Registration failed.", "error");
        }
    };

    // RELEASE PORT ON UNMOUNT
    // The Web Serial API requires closing the writer AND cancelling the reader
    // before port.close() will work. Without this sequence, the port's streams
    // remain locked and port.close() silently fails.
    useEffect(() => {
        return () => {
            (async () => {
                try {
                    // 1. Close the writer (unlocks the writable stream pipe)
                    if (writerRef.current) {
                        await writerRef.current.close().catch(() => { });
                        writerRef.current = null;
                    }
                    // 2. Cancel the reader (unlocks the readable stream pipe)
                    if (readerRef.current) {
                        await readerRef.current.cancel().catch(() => { });
                        readerRef.current = null;
                    }
                    // 3. Wait for the pipe promises to settle
                    if (writableClosedRef.current) {
                        await writableClosedRef.current.catch(() => { });
                        writableClosedRef.current = null;
                    }
                    if (readableClosedRef.current) {
                        await readableClosedRef.current.catch(() => { });
                        readableClosedRef.current = null;
                    }
                    // 4. Now close the port (streams are unlocked)
                    if (portRef.current) {
                        await portRef.current.close().catch(() => { });
                        portRef.current = null;
                    }
                } catch (e) {
                    console.warn("Port cleanup error:", e);
                }
                isReadingRef.current = false;
            })();
        };
    }, []);

    useEffect(() => {
        if (!("serial" in navigator)) return;

        // Auto-connect to an already-approved port when navigating to this page.
        // This means switching from Top-Up → Register Card works without replug.
        navigator.serial.getPorts().then((ports) => {
            // Filter for actual USB devices (ignores internal COM/Bluetooth ports)
            const usbPorts = ports.filter(p => p.getInfo().usbVendorId);
            if (usbPorts.length > 0 && !isReadingRef.current) {
                startReading(usbPorts[0]);
            }
        });

        const handleConnect = (e) => startReading(e.target);
        const handleDisconnect = () => {
            setIsConnected(false); isReadingRef.current = false;
            showToast("Scanner Disconnected", "error");
        };
        navigator.serial.addEventListener("connect", handleConnect);
        navigator.serial.addEventListener("disconnect", handleDisconnect);
        return () => {
            navigator.serial.removeEventListener("connect", handleConnect);
            navigator.serial.removeEventListener("disconnect", handleDisconnect);
        };
    }, []);

    const handleManualConnect = async () => {
        try {
            const port = await navigator.serial.requestPort();
            startReading(port);
        } catch (err) { console.log(err); }
    };

    const isFormValid = !isRegistered && uid && ownerName && initialLoad;

    return (
        <div className={styles.container}>

            {/* SIDEBAR */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.logoSection}>
                    <Image src="/logo.png" width={40} height={40} alt="Logo" />
                    <div className={styles.sanivend}><span>SANI</span><span className={styles.vend}>VEND</span></div>
                    <div className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>✕</div>
                </div>
                <nav className={styles.navMenu}>
                    <Link href="/dashboard" className={styles.navItem}>
                        <Image src="/dashboard-icon.svg" width={20} height={20} alt="Dashboard" />
                        <span>Dashboard</span>
                    </Link>
                    <Link href="/stock" className={styles.navItem}>
                        <Image src="/stock-icon.svg" width={20} height={20} alt="Stock" />
                        <span>Stock Management</span>
                    </Link>
                    <Link href="/sales" className={styles.navItem}>
                        <Image src="/sales-icon.svg" width={20} height={20} alt="Sales" />
                        <span>Transaction History</span>
                    </Link>
                    <Link href="/rfid" className={styles.navItem}>
                        <Image src="/card-icon.svg" width={20} height={20} alt="RFID" />
                        <span>RFID Card Top-Up</span>
                    </Link>
                    <div className={`${styles.navItem} ${styles.activeNavItem}`}>
                        <Image src="/user-profile.svg" width={20} height={20} alt="Register" />
                        <span>Register Card</span>
                    </div>
                    <Link href="/errors" className={styles.navItem}>
                        <Image src="/error-icon.svg" width={20} height={20} alt="Errors" />
                        <span>Error Alerts</span>
                    </Link>
                </nav>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <Image className={styles.menuIcon} src="/menu-icon.svg" width={24} height={24} alt="Menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <div className={styles.headerLeft}>
                        <div className={styles.pageTitle}>REGISTER NEW CARD</div>
                    </div>
                    <div className={styles.userProfile} onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} onBlur={() => setTimeout(() => setIsProfileDropdownOpen(false), 200)} tabIndex={0} style={{position: 'relative', cursor: 'pointer', outline: 'none'}}>
                        <Image src="/user-profile.svg" width={30} height={30} alt="User" />
                        {isProfileDropdownOpen && (
                            <div className="profileDropdown">
                                <div className="dropdownItem" onClick={() => window.location.href = '/settings'}>Settings</div>
                                <div className="dropdownItem" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; }}>Logout</div>
                            </div>
                        )}
                    </div>
                </header>

                <div className={styles.contentArea}>

                    {/* 1. STATUS BAR */}
                    <div className={styles.statusBar}>
                        <div className={styles.statusItem} onClick={!isConnected ? handleManualConnect : undefined}>
                            <span className={styles.statusLabel}>Scanner Status</span>
                            <div className={styles.statusBadgeContainer}>
                                <div className={`${styles.statusDot} ${isConnected ? styles.dotGreen : styles.dotRed}`}></div>
                                <span className={`${styles.statusText} ${isConnected ? styles.textGreen : styles.textRed}`}>
                                    {isConnected ? "Connected" : "Not Connected (Click)"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. MAIN CARD */}
                    <div className={styles.mainCard}>
                        <div className={styles.cardLeft}>
                            <div className={styles.iconWrapper}>
                                <Image
                                    src={
                                        !isConnected ? "/scanner-icon.svg"
                                            : uid ? (justRegistered ? "/user-profile.svg" : (isRegistered ? "/error-icon.svg" : "/user-profile.svg"))
                                                : "/scan-card-icon.svg"
                                    }
                                    width={80} height={80} alt="Status" className={styles.largeIcon}
                                />
                            </div>
                            <p className={styles.instructionText}>
                                {!isConnected
                                    ? "RFID scanner is currently disconnected. Click the status bar to connect."
                                    : uid
                                        ? (justRegistered
                                            ? "Registration Successful! You may now remove the card."
                                            : (isRegistered
                                                ? "This card is already registered. Please use a new card."
                                                : "New card detected. Please fill in the details to register."))
                                        : "Scanner is ready. Tap a new card to register."
                                }
                            </p>
                        </div>

                        <div className={styles.cardRight}>
                            <div className={styles.inputWrapper}>
                                <label className={styles.inputLabel}>Scanned UID</label>
                                <input type="text" className={`${styles.inputField} ${styles.inputReadOnly}`} value={maskUid(uid)} readOnly />
                            </div>

                            <div className={styles.inputWrapper}>
                                <label className={styles.inputLabel}>Student Name</label>
                                <input
                                    type="text" className={styles.inputField} value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="Enter Name" disabled={!uid || (isRegistered && !justRegistered)}
                                />
                            </div>

                            <div className={styles.inputWrapper}>
                                <label className={styles.inputLabel}>Starting Load (Php)</label>
                                <input
                                    type="number" className={styles.inputField} value={initialLoad}
                                    onChange={(e) => setInitialLoad(e.target.value)}
                                    placeholder="0.00" disabled={!uid || (isRegistered && !justRegistered)}
                                />
                            </div>

                            <button
                                className={`${styles.confirmBtn} ${isFormValid ? styles.confirmBtnActive : ''}`}
                                onClick={handleRegister}
                                disabled={!isFormValid || (isRegistered && !justRegistered) || isWritingCard}
                                style={{
                                    background: justRegistered ? '#12DE37' : undefined,
                                    color: justRegistered ? '#fff' : undefined,
                                    borderColor: justRegistered ? '#12DE37' : undefined
                                }}
                            >
                                {isWritingCard ? "Writing to Card..." : justRegistered ? "Success!" : (isRegistered ? "Already Registered" : "Register Card")}
                            </button>
                        </div>
                    </div>

                    {/* 3. RECENT REGISTRATIONS TABLE */}
                    <div className={styles.tableContainer}>
                        <div className={styles.tableHeaderTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Recent Registrations</span>
                            <div style={{ position: 'relative' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder="Search owner or ID..." 
                                    style={{ padding: '8px 16px 8px 36px', borderRadius: '12px', border: '1.5px solid rgba(168, 218, 220, 0.5)', background: '#F8FBFC', fontSize: '13px', outline: 'none', minWidth: '220px', color: '#1D3557' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className={styles.historyTable}>
                            <thead>
                                <tr>
                                    <th>Last Activity</th>
                                    <th>Card ID</th>
                                    <th>Owner Name</th>
                                    <th>Current Balance</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.map((card) => (
                                    <tr key={card.id}>
                                        <td>{new Date(card.lastLoaded).toLocaleDateString()}</td>
                                        <td>{maskUid(card.uid)}</td>
                                        <td>
                                            {editingId === card.id ? (
                                                <input
                                                    className={styles.editInput}
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                card.owner
                                            )}
                                        </td>
                                        <td>Php {Number(card.balance).toFixed(2)}</td>
                                        <td className={styles.actionCell}>
                                            {editingId === card.id ? (
                                                <>
                                                    <button className={`${styles.iconBtn} ${styles.btnSave}`} onClick={() => saveEdit(card.id)}>
                                                        <SaveIcon />
                                                    </button>
                                                    <button className={`${styles.iconBtn} ${styles.btnCancel}`} onClick={cancelEditing}>
                                                        <CloseIcon />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className={styles.iconBtn} onClick={() => startEditing(card)} title="Edit Name">
                                                        <EditIcon />
                                                    </button>
                                                    {/* CHANGED THIS ONCLICK */}
                                                    <button className={`${styles.iconBtn} ${styles.btnDelete}`} onClick={() => initiateDelete(card.id, card.uid)} title="Delete Card">
                                                        <TrashIcon />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!recentCards && <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Loading recent registrations...</td></tr>}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* --- CUSTOM DELETE MODAL --- */}
                {deleteModal.show && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalCard}>
                            <div className={styles.modalTitle}>Confirm Deletion</div>
                            <p className={styles.modalText}>
                                Are you sure you want to delete this card?
                                <br />This action cannot be undone.
                            </p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.btnCancelModal}
                                    onClick={() => setDeleteModal({ show: false, id: null })}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.btnConfirmModal}
                                    onClick={confirmDelete}
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PREMIUM TOAST NOTIFICATION --- */}
                {toast.show && (
                    <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError :
                        toast.type === 'success' ? styles.toastSuccess : styles.toastInfo
                        }`}>
                        <span className={styles.toastIcon}>
                            {toast.type === 'success' ? <SuccessIcon /> : toast.type === 'error' ? <ErrorIcon /> : <InfoIcon />}
                        </span>
                        <span className={styles.toastMessage}>{toast.message}</span>
                    </div>
                )}

            </main>
        </div>
    );
};