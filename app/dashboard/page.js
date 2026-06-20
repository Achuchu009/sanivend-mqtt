// app/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function Dashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- NOTIFICATION STATE ---
  const [showModal, setShowModal] = useState(false);
  const [notifData, setNotifData] = useState({ 
    lowStockCount: 0, 
    lowStockNames: "", 
    outOfStockCount: 0, 
    activeErrors: 0,
    errorMessages: "",
    enableLowStock: true,
    enableErrors: true
  });

  // Fetch Real-time Data
  const { data, error } = useSWR('/api/dashboard', fetcher, { refreshInterval: 2000 });

  // DITO NATIN NILAGAY ANG REAL-TIME STATUS
  const isMachineOnline = data ? data.isMachineConnected : false;

  // --- 1. CHECK STATUS ON LOAD ---
  useEffect(() => {
    const checkNotifications = async () => {
      const lastActive = localStorage.getItem('lastActiveTime');
      
      try {
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastLogout: lastActive || new Date().toISOString() })
        });
        const result = await res.json();

        setNotifData(result);
        
        if (result.showPopup && (result.lowStockCount > 0 || result.outOfStockCount > 0 || result.activeErrors > 0)) {
            setShowModal(true);
        }
      } catch (err) {
        console.error("Notification Error", err);
      }
    };

    checkNotifications();
  }, []);

  // --- 2. HEARTBEAT LOGIC ---
  useEffect(() => {
    const heartbeat = setInterval(() => {
      localStorage.setItem('lastActiveTime', new Date().toISOString());
    }, 5000);

    const handleUnload = () => {
      localStorage.setItem('lastActiveTime', new Date().toISOString());
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const handleLogout = async () => {
    localStorage.setItem('lastActiveTime', new Date().toISOString());
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (error) return <div className={styles.container}>Network Error</div>;
  if (!data) return <div className={styles.container} style={{justifyContent:'center', alignItems:'center'}}>Loading System...</div>;

  if (data.error || !data.inventory) {
    return (
      <div className={styles.container} style={{flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
        <h3>Database Error</h3>
        <p>{data.error || "Inventory data is missing."}</p>
        <p style={{fontSize:'12px', color:'#666'}}>Try running: npx prisma db push</p>
      </div>
    );
  }

  const getProductImage = (name) => {
    if (!name) return "/wipes.svg";
    if (name.includes("Wipes")) return "/wipes.svg";
    if (name.includes("Heavy Flow")) return "/heavy-flow-icon.png";
    if (name.includes("Regular")) return "/regular-pad.svg";
    if (name.includes("Liner")) return "/panty-liner.svg";
    return "/wipes.svg"; 
  };

  return (
    <div className={styles.container}>
      
      {/* --- SIDEBAR --- */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoSection}>
          <Image src="/logo.png" width={40} height={40} alt="Logo" />
          <div className={styles.sanivend}>
            <span>SANI</span><span className={styles.vend}>VEND</span>
          </div>
          <div className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>✕</div>
        </div>

        <nav className={styles.navMenu}>
          <div className={`${styles.navItem} ${styles.activeNavItem}`}>
            <Image src="/dashboard-icon.svg" width={20} height={20} alt="Dashboard" />
            <span>Dashboard</span>
          </div>
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
          <Link href="/register-card" className={styles.navItem}>
            <Image src="/user-profile.svg" width={20} height={20} alt="Register" />
            <span>Register Card</span>
          </Link>
          <Link href="/errors" className={styles.navItem}>
            <Image src="/error-icon.svg" width={20} height={20} alt="Errors" />
            <span>Error Alerts</span>
          </Link>
          <Link href="/settings" className={styles.navItem}>
            <Image src="/settings-icon.svg" width={20} height={20} alt="Settings" />
            <span>Settings</span>
          </Link>
        </nav>

        <div className={styles.logoutSection}>
          <div className={styles.navItem} onClick={handleLogout} style={{cursor: 'pointer'}}>
            <Image src="/logout-icon.svg" width={20} height={20} alt="Logout" />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={styles.mainContent}>
        
        <header className={styles.header}>
            <Image className={styles.menuIcon} src="/menu-icon.svg" width={24} height={24} alt="Menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={styles.headerLeft}>
                <div className={styles.pageTitle}>DASHBOARD OVERVIEW</div>
            </div>
            <div className={styles.userProfile}>
                <span>Juan Dela Cruz</span>
                <Image src="/user-profile.svg" width={30} height={30} alt="User" />
            </div>
        </header>

        <div className={styles.dashboardContent}>
            
            {/* 1. STOCK LEVELS SECTION */}
            <div className={styles.sectionContainer}>
                
                {/* HEADER ROW WITH STATUS BADGE */}
                <div className={styles.headerRow}>
                    <h2 className={styles.sectionTitle}>Machine Status & Stock Levels</h2>
                    
                    <div className={`${styles.connectionBadge} ${
                        !isMachineOnline ? styles.statusOffline : styles.statusOnline
                    }`}>
                        <div className={styles.statusDot}></div>
                        <span>
                            {!isMachineOnline ? 'MACHINE OFFLINE' : 'MACHINE ONLINE'}
                        </span>
                    </div>
                </div>

                <div className={styles.stockGrid}>
                    {data.inventory.map((item) => (
                        <div key={item.slotId} className={styles.stockCard}>
                            <div className={`${styles.statusBadge} ${
                                item.stock === 0 ? styles.stockCardError : 
                                item.stock <= (item.threshold ?? 5) ? styles.statusBadgeWarning : ''
                            }`}>
                                {item.stock === 0 ? 'EMPTY' : item.stock <= (item.threshold ?? 5) ? '!' : 'OK'}
                            </div>
                            <div className={styles.slotLabel}>Slot {item.slotId.replace('slot', '')}:</div>
                            <div className={styles.iconCircle}>
                                <Image 
                                    className={styles.productImage} 
                                    src={getProductImage(item.name)} 
                                    width={40} height={40} 
                                    alt={item.name || "Product"} 
                                    style={item.stock === 0 ? {filter: 'grayscale(100%)', opacity: 0.5} : {}}
                                />
                            </div>
                            <div className={styles.productName}>{item.name}</div>
                            <div className={styles.stockCount}>
                                STOCK: <span className={
                                    item.stock === 0 ? styles.stockNumberZero : 
                                    item.stock <= (item.threshold ?? 5) ? styles.stockNumberLow : 
                                    styles.stockNumber
                                }>
                                    {item.stock}/{item.max}
                                </span>
                            </div>
                            <div className={styles.progressBarBg}>
                                <div 
                                    className={`${styles.progressBarFill} ${
                                        item.stock === 0 ? styles.progressBarZero : 
                                        item.stock <= (item.threshold ?? 5) ? styles.progressBarLow : ''
                                    }`} 
                                    style={{width: `${(item.stock / item.max) * 100}%`}}
                                ></div>
                            </div>
                            {item.stock === 0 ? (
                                <div style={{color:'#FF0000', fontSize:'11px', fontWeight:'bold', marginTop:'5px'}}>
                                    OUT OF STOCK
                                </div>
                            ) : item.stock <= (item.threshold ?? 5) ? (
                                <div style={{color:'#FF8000', fontSize:'10px', marginTop:'5px'}}>
                                    Low Stock Warning
                                </div>
                            ) : null}
                            <Link href="/stock">
                                <button className={styles.refillBtn}>Refill</button>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. BOTTOM SECTION (Sales & Errors) */}
            <div className={styles.bottomSection}>
                <div className={styles.salesCard}>
                    <div>
                        <div className={styles.salesLabel}>Today’s Sales</div>
                        <div className={styles.salesAmount}>Php {Number(data.totalSales).toFixed(2)}</div>
                        <div className={styles.salesSubtext}>Total Sales Today</div>
                    </div>
                    <Image src="/sales-graph.svg" width={60} height={60} alt="Graph" />
                </div>

                <div className={styles.errorSection}>
                    <h3 className={styles.sectionTitle}>Recent Errors</h3>
                    {data.logs && data.logs.length > 0 ? (
                        data.logs.map((log) => (
                            <div key={log.id} className={styles.errorCard}>
                                <Image src="/error-warning.svg" width={24} height={24} alt="Error" />
                                <div className={styles.errorText}>
                                    <div style={{fontSize:'12px', color:'#888'}}>
                                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    <div><b>ERROR:</b> <span>{log.message}</span></div>
                                </div>
                                <div style={{marginLeft:'auto', fontSize:'10px', color:'#999'}}>{log.errorCode}</div>
                            </div>
                        ))
                    ) : (
                        <div style={{color: '#888', fontStyle: 'italic', padding: '10px'}}>No recent errors. System Healthy.</div>
                    )}
                </div>
            </div>

        </div>

        {/* --- 3. PREMIUM SYSTEM NOTICE MODAL --- */}
        {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
                <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                    
                    <div className={styles.modalTitle}>System Notice</div>
                    <p className={styles.modalSubtitle}>Summary of items requiring attention.</p>
                    
                    <div className={styles.modalBody}>
                        
                        {notifData.enableLowStock && (
                            <>
                                {/* ROW 1: LOW STOCK */}
                                <div className={styles.statRow} onClick={() => router.push('/stock')}>
                                    <div className={styles.statRowHeader}>
                                        <span className={styles.statLabel}>Low Stock Items</span>
                                        <span className={notifData.lowStockCount > 0 ? styles.countOrange : styles.countGreen}>
                                            {notifData.lowStockCount}
                                        </span>
                                    </div>
                                    <div className={styles.statSubtext}>
                                        {notifData.lowStockNames || "Stock levels are good."}
                                    </div>
                                </div>

                                {/* ROW 2: OUT OF STOCK */}
                                <div className={styles.statRow} onClick={() => router.push('/stock')}>
                                    <div className={styles.statRowHeader}>
                                        <span className={styles.statLabel}>Out of Stock</span>
                                        <span className={notifData.outOfStockCount > 0 ? styles.countRed : styles.countGreen}>
                                            {notifData.outOfStockCount}
                                        </span>
                                    </div>
                                    <div className={styles.statSubtext}>
                                        {notifData.outOfStockNames || "No items out of stock."}
                                    </div>
                                </div>
                            </>
                        )}

                        {notifData.enableErrors && (
                            <div className={styles.statRow} onClick={() => router.push('/errors')}>
                                {/* ROW 3: SYSTEM ERRORS */}
                                <div className={styles.statRowHeader}>
                                    <span className={styles.statLabel}>Active Alerts</span>
                                    <span className={notifData.activeErrors > 0 ? styles.countRed : styles.countGreen}>
                                        {notifData.activeErrors}
                                    </span>
                                </div>
                                <div className={styles.statSubtext}>
                                    {notifData.errorMessages || "System is running smoothly."}
                                </div>
                            </div>
                        )}

                    </div>

                    <button className={styles.closeModalBtn} onClick={handleCloseModal}>
                        Got it, Thanks!
                    </button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};