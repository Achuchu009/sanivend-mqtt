// app/rfid/page.js
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import styles from './rfid.module.css';
import useSWR, { mutate } from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

function formatRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// --- SVG ICONS ---
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
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const EmptyStateIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#CBD5E1' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

export default function RFIDPage() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [uid, setUid] = useState('');
  const [balance, setBalance] = useState(0);
  const [owner, setOwner] = useState('Unknown');
  const [amount, setAmount] = useState('');

  const [isConnected, setIsConnected] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const portRef = useRef(null);
  const writerRef = useRef(null);
  const readerRef = useRef(null);
  const readableClosedRef = useRef(null);   // pipeTo promise — must await before port.close()
  const writableClosedRef = useRef(null);   // pipeTo promise — must await before port.close()
  const lastSeenRef = useRef(0);
  const isReadingRef = useRef(false);
  const isWritingRef = useRef(false);
  const amountRef = useRef('');
  const cardRegisteredRef = useRef(true); // optimistic: show chip balance until DB says otherwise

  // NEW: Ref to keep track of UID inside the serial loop
  const uidRef = useRef('');

  const { data: history } = useSWR(`/api/rfid?type=history${uid ? `&uid=${uid}` : ''}`, fetcher, { refreshInterval: 2000 });

  // ── Table state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredHistory = Array.isArray(history) ? history.filter(log => {
    const query = searchQuery.toLowerCase();
    const absoluteTime = formatFullTime(log.createdAt).toLowerCase();
    const relativeTime = formatRelativeTime(log.createdAt).toLowerCase();
    return !searchQuery ||
      (log.cardUid && log.cardUid.toLowerCase().includes(query)) ||
      (log.status && log.status.toLowerCase().includes(query)) ||
      absoluteTime.includes(query) ||
      relativeTime.includes(query);
  }).sort((a, b) => {
    if (sortOption === 'Newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOption === 'Oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOption === 'Success First') return a.status === 'Success' ? -1 : 1;
    return 0;
  }) : [];

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOption]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (n) => setCurrentPage(n);

  const getVisiblePages = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    if (current <= 3) end = 4;
    if (current >= total - 2) start = total - 3;
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  };
  const visiblePages = getVisiblePages(currentPage, totalPages);
  // ────────────────────────────────────────────────────────────────────────────

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const maskUid = (rawUid) => {
    if (!rawUid) return "********";
    return `*******${rawUid.slice(-4)}`;
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    amountRef.current = val;
  };

  // Keep uidRef in sync with state
  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  // WATCHDOG TIMER
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastSeenRef.current > 2000 && uid) {
        setUid('');
        setBalance(0);
        setAmount('');
        amountRef.current = '';
        setOwner('');
        setCurrentCard(null);
        setIsChecking(false);
        cardRegisteredRef.current = true; // reset to optimistic for next card
        if (!isWritingRef.current) showToast("Card Removed.", "error");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [uid]);

  // ============================================================
  // CORE SERIAL LOGIC
  // ============================================================
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
      showToast("Scanner Connected!", "success");

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

            // --- SUCCESS: READ DATA ---
            if (cleanLine.startsWith("DATA|")) {
              const parts = cleanLine.split('|');
              if (parts.length >= 3) {
                const scannedUid = parts[1];
                const scannedBal = parseFloat(parts[2]);

                if (scannedUid) {
                  lastSeenRef.current = Date.now();

                  setUid((prevUid) => {
                    if (prevUid !== scannedUid) {
                      setIsChecking(true);
                      handleCheckCard(scannedUid);
                    }
                    return scannedUid;
                  });

                  // If writing was active, it means this scan confirms success
                  if (isWritingRef.current) {
                    // Log Success
                    syncBalanceToDB(scannedUid, scannedBal, amountRef.current, "Success");
                    setBalance(scannedBal); // Update UI to new chip balance
                    isWritingRef.current = false;
                    setIsWriting(false);
                    setAmount('');
                    amountRef.current = '';
                    showToast("Load Added & Synced!", "success");
                  }
                }
              }
            }

            // --- FAILURE: ERROR SIGNAL ---
            if (cleanLine.startsWith("ERROR:")) {
              const failedUid = uidRef.current; // Get the UID that failed

              if (isWritingRef.current && failedUid) {
                // Log Failure to DB
                console.log("Transaction Failed for:", failedUid);
                syncBalanceToDB(failedUid, 0, amountRef.current, "Failed");
              }

              isWritingRef.current = false;
              setIsWriting(false);
              showToast("Write Failed. Transaction Logged.", "error");
            }
          }
        }
      }
    } catch (err) {
      console.error("Reader Error:", err);
      setIsConnected(false);
      isReadingRef.current = false;
      showToast("Failed to open port. Check connection.", "error");
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

  // USB LISTENERS + AUTO-DETECT ON MOUNT
  useEffect(() => {
    if (!("serial" in navigator)) return;

    // Auto-connect to an already-approved port when navigating to this page.
    // This means switching from Register Card → Top-Up works without replug.
    navigator.serial.getPorts().then((ports) => {
      // Filter for actual USB devices (ignores internal COM/Bluetooth ports)
      const usbPorts = ports.filter(p => p.getInfo().usbVendorId);
      if (usbPorts.length > 0 && !isReadingRef.current) {
        startReading(usbPorts[0]);
      }
    });

    const handleConnect = (e) => startReading(e.target);
    const handleDisconnect = () => {
      setIsConnected(false);
      isReadingRef.current = false;
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
    if (!("serial" in navigator)) return showToast("Browser not supported.", "error");
    try {
      const port = await navigator.serial.requestPort();
      startReading(port);
    } catch (err) { console.log("User cancelled"); }
  };

  // ============================================================
  // API CALLS
  // ============================================================
  const handleCheckCard = async (scannedUid) => {
    try {
      const res = await fetch(`/api/rfid?uid=${scannedUid}`);

      if (res.status === 404) {
        setCurrentCard(null);
        setOwner("Unregistered");
        setBalance(0);
        cardRegisteredRef.current = false;

        // Physically zero the chip so the vending machine can't use it either.
        // This covers the case where the card was deleted while not on the scanner.
        if (writerRef.current) {
          try {
            await writerRef.current.write('SET:0\n');
          } catch (e) {
            console.error('Failed to zero chip:', e);
          }
        }

        showToast("Card Not Registered!", "error");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setCurrentCard(data);
        setOwner(data.owner);
        cardRegisteredRef.current = true;
        setBalance(parseFloat(data.balance)); // ensure it's a number for .toFixed()
      }
    } catch (err) { console.error(err); }
    finally {
      setIsChecking(false);
    }
  };

  // UPDATED: Now accepts 'status'
  const syncBalanceToDB = async (uid, newBalance, addedAmount, status = "Success") => {
    try {
      await fetch('/api/rfid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          newBalance,
          addedAmount,
          status // Pass status to API
        })
      });
      mutate('/api/rfid?type=history'); // Refresh table immediately
    } catch (err) { console.error("Sync Failed"); }
  };

  const handleTopUp = async () => {
    if (Date.now() - lastSeenRef.current > 2000) {
      showToast("Card Removed! Hold card to reader.", "error");
      return;
    }
    if (!uid || !amount) return;

    isWritingRef.current = true;
    setIsWriting(true);

    showToast("Writing to Card... DO NOT REMOVE", "info");

    const command = `ADD:${amount}\n`;
    await writerRef.current.write(command);
  };

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
          <div className={`${styles.navItem} ${styles.activeNavItem}`}>
            <Image src="/card-icon.svg" width={20} height={20} alt="RFID" />
            <span>RFID Card Top-Up</span>
          </div>
          <Link href="/register-card" className={styles.navItem}>
            <Image src="/user-profile.svg" width={20} height={20} alt="Register" />
            <span>Register Card</span>
          </Link>
          <Link href="/errors" className={styles.navItem}>
            <Image src="/error-icon.svg" width={20} height={20} alt="Errors" />
            <span>Error Alerts</span>
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <Image className={styles.menuIcon} src="/menu-icon.svg" width={24} height={24} alt="Menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <div className={styles.headerLeft}>
            <div className={styles.pageTitle}>RFID CARD TOP-UP</div>
          </div>
          <div className={styles.userProfile} onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} onBlur={() => setTimeout(() => setIsProfileDropdownOpen(false), 200)} tabIndex={0} style={{ position: 'relative', cursor: 'pointer', outline: 'none' }}>
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
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Card Status</span>
              <div className={styles.statusBadgeContainer}>
                <div className={`${styles.statusDot} ${uid ? styles.dotGreen : styles.dotGray}`}></div>
                <span className={`${styles.statusText} ${uid ? styles.textGreen : styles.textGray}`}>
                  {uid ? "Card Detected" : "No Card"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. MAIN CARD */}
          <div className={styles.mainCard}>
            <div className={styles.cardLeft}>
              <div className={styles.iconWrapper}>
                <Image
                  src={!isConnected ? "/scanner-icon.svg" : uid ? "/card-bold.svg" : "/scan-card-icon.svg"}
                  width={80} height={80}
                  alt="Status"
                  className={styles.largeIcon}
                />
              </div>
              <p className={styles.instructionText}>
                {!isConnected
                  ? "The RFID scanner is currently disconnected. Click the scanner status bar to connect. "
                  : uid
                    ? "Card detected successfully. Current balance shown below."
                    : "Scanner is ready. Tap the student's RFID card to proceed."
                }
              </p>
            </div>

            <div className={styles.cardRight}>
              <div className={styles.balanceContainer}>
                <span className={styles.balanceLabel}>Current Balance</span>
                <div className={`${styles.balanceAmount} ${uid ? styles.balanceActive : ''}`}>
                  {isChecking ? "Checking..." : `Php ${balance.toFixed(2)}`}
                </div>
                {uid && !isChecking && (
                  <div className={`${styles.ownerBadge} ${currentCard ? styles.ownerValid : styles.ownerInvalid}`}>
                    {currentCard ? `Owner: ${owner}` : "UNREGISTERED CARD"}
                  </div>
                )}
              </div>

              <div className={styles.inputWrapper}>
                <label className={styles.inputLabel}>Enter Amount to Load</label>
                <input
                  type="number"
                  className={styles.inputField}
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={!uid || isWriting || !currentCard}
                />
                <button
                  className={`${styles.confirmBtn} ${uid && amount && currentCard ? styles.confirmBtnActive : ''}`}
                  onClick={handleTopUp}
                  disabled={!uid || !amount || isWriting || !currentCard}
                >
                  {isWriting ? "Processing Transaction..." : "Confirm Top-Up"}
                </button>
              </div>
            </div>
          </div>

          {/* 3. FILTER BAR — separate card */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <div className={styles.filterGroup}>
                <FilterIcon />
                <span className={styles.filterLabel}>Sort</span>
                <div className={styles.filterPills}>
                  {['Newest', 'Oldest'].map(tab => (
                    <button
                      key={tab}
                      className={`${styles.filterPill} ${sortOption === tab ? styles.filterPillActive : ''}`}
                      onClick={() => setSortOption(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.searchContainer}>
                <SearchIcon />
                <input
                  type="text" placeholder="Search card ID, status, date..."
                  className={styles.searchInput}
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className={styles.clearSearch} onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
                )}
              </div>
            </div>
            <span className={styles.filterMeta}>
              {filteredHistory.length} result{filteredHistory.length !== 1 && 's'}
            </span>
          </div>

          {/* 4. HISTORY TABLE — separate card */}
          <div className={styles.tableContainer}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Card ID</th>
                  <th>Amount Added</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((log) => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td>
                      <span className={styles.relTime} title={formatFullTime(log.createdAt)}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
                      <span className={styles.absTime}>
                        {formatFullTime(log.createdAt)}
                      </span>
                    </td>
                    <td><span className={styles.codeBadge}>{maskUid(log.cardUid)}</span></td>
                    <td style={{ color: log.status === 'Success' ? '#2A9D8F' : '#E63946', fontWeight: '700' }}>
                      {log.status === 'Success' ? '+' : ''}Php {log.amount}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${log.status === 'Success' ? styles.statusSuccess : styles.statusFailed}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!history && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Loading transaction history...</td></tr>
                )}
                {history && currentItems.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      <div className={styles.emptyState}>
                        <EmptyStateIcon />
                        <p className={styles.emptyStateTitle}>No transactions found</p>
                        <p className={styles.emptyStateText}>
                          {searchQuery
                            ? `No results for "${searchQuery}". Try a different search.`
                            : 'No transaction history yet.'}
                        </p>
                        {searchQuery && (
                          <button className={styles.emptyStateClear} onClick={() => setSearchQuery('')}>Clear search</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.paginationMeta}>
                  {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredHistory.length)} of {filteredHistory.length}
                </span>
                <div className={styles.paginationBtns}>
                  <button className={styles.pageBtn} onClick={prevPage} disabled={currentPage === 1} aria-label="Previous">
                    <ChevronLeftIcon />
                  </button>
                  {visiblePages.map((page, index) => (
                    page === '...' ? (
                      <span key={index} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={index}
                        className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  <button className={styles.pageBtn} onClick={nextPage} disabled={currentPage === totalPages} aria-label="Next">
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TOAST */}
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