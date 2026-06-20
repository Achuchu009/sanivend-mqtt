// app/stock/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import Link from "next/link";
import styles from './stock.module.css';
import useSWR, { mutate } from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// --- PROFESSIONAL SVG ICONS (NO EMOJIS) ---
const SuccessIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#2A9D8F'}}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const ErrorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#E63946'}}>
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);

const InfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#457B9D'}}>
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export default function StockPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const { data: inventory, error } = useSWR('/api/inventory', fetcher);
  const router = useRouter();
  
  // Local state for inputs
  const [editValues, setEditValues] = useState({});

  // Initialize: Set Stock to EMPTY STRING so placeholder shows
  useEffect(() => {
    if (inventory) {
      const initialValues = {};
      inventory.forEach(item => {
        // FIX: stock is set to '' (empty) by default
        initialValues[item.slotId] = { stock: '', max: item.max, price: item.price };
      });
      setEditValues(initialValues);
    }
  }, [inventory]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleInputChange = (slotId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value
      }
    }));
  };

  const handleUpdate = async (slotId) => {
    const values = editValues[slotId];
    if (!values) return;

    // Find the specific item in the inventory to access its current values
    const item = inventory.find(i => i.slotId === slotId);
    if (!item) return;

    // Convert input string to number. If left blank, preserve existing database value.
    const currentStock = values.stock === '' ? item.stock : parseInt(values.stock);
    const maxCapacity = values.max === '' || values.max === undefined ? item.max : parseInt(values.max);
    const newPrice = values.price === '' || values.price === undefined ? item.price : parseFloat(values.price);

    // Validation
    if (currentStock > maxCapacity) {
        showToast("Stock cannot exceed Max Capacity!", "error");
        return;
    }

    if (currentStock < 0) {
        showToast("Stock cannot be negative!", "error");
        return;
    }

    if (isNaN(newPrice) || newPrice < 0) {
        showToast("Please enter a valid price!", "error");
        return;
    }

    showToast(`Updating Slot...`, 'info');

    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slotId,
          newStock: currentStock,
          newMax: maxCapacity,
          newPrice: newPrice
        })
      });

      if (res.ok) {
        await mutate('/api/inventory'); 
        showToast("Stock Updated Successfully!", "success");
        // Optional: Clear the input after success
        handleInputChange(slotId, 'stock', '');
      } else {
        showToast("Failed to update.", "error");
      }
    } catch (err) {
      console.error("Network Error:", err);
      showToast("Server Error", "error");
    }
  };

  const getProductImage = (name) => {
    if (name.includes("Wipes")) return "/wipes.svg";
    if (name.includes("Heavy Flow")) return "/heavy-flow-icon.png";
    if (name.includes("Regular")) return "/regular-pad.svg";
    if (name.includes("Liner")) return "/panty-liner.svg";
    return "/wipes.svg"; 
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "No Record";
    return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true 
    });
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  if (error) return <div className={styles.container}>Network Error</div>;
  if (!inventory) return <div className={styles.container}>Loading Inventory...</div>;

  return (
    <div className={styles.container}>
      
      {/* --- SIDEBAR --- */}
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
          <Link href="/stock" className={`${styles.navItem} ${styles.activeNavItem}`}>
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
                <div className={styles.pageTitle}>STOCK MANAGEMENT</div>
            </div>
            <div className={styles.userProfile}>
                <span>Juan Dela Cruz</span>
                <Image src="/user-profile.svg" width={30} height={30} alt="User" />
            </div>
        </header>

        <div className={styles.contentArea}>
            <div className={styles.cardGrid}>
                
                {inventory.map((item) => (
                    <div key={item.slotId} className={styles.editCard}>
                        
                        {/* Header: Image & Name */}
                        <div className={styles.cardHeader}>
                            <div className={styles.headerLeftInfo}>
                                <Image className={styles.productImage} src={getProductImage(item.name)} width={50} height={50} alt={item.name} />
                                <div>
                                    <div className={styles.slotTitle}>Slot {item.slotId.replace('slot', '')}</div>
                                    <div className={styles.productName}>{item.name}</div>
                                </div>
                            </div>
                            <div className={styles.headerRightInfo}>
                                <div className={styles.lastRefill}>Last Refill: {formatDate(item.lastRefill)}</div>
                            </div>
                        </div>

                        {/* Status Container */}
                        <div className={styles.statusContainer}>
                            <div>
                                <span className={styles.statusLabel}>Current Level</span>
                                <span className={styles.statusValue}>
                                    {item.stock} <span className={styles.statusMax}>/ {item.max}</span>
                                </span>
                            </div>
                        <div>
                            <span className={styles.statusLabel}>Unit Price</span>
                            <span className={styles.statusValue}>
                                ₱{item.price}
                            </span>
                        </div>
                            <div className={styles.statusBadgeWrapper}>
                                <span className={styles.statusLabel}>Status</span>
                                <span className={`${styles.statusBadge} ${item.stock <= (item.threshold ?? 5) ? styles.statusLow : styles.statusNormal}`}>
                                    {item.stock <= (item.threshold ?? 5) ? 'Low' : 'Normal'}
                                </span>
                            </div>
                        </div>

                        {/* INPUTS GRID (Fixed Layout) */}
                        <div className={styles.inputsGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Set New Stock Level</label>
                                <input 
                                    type="number" 
                                    className={styles.numberInput}
                                    placeholder="Enter quantity" 
                                    // FIX: Uses optional chaining and falls back to ''
                                    value={editValues[item.slotId]?.stock ?? ''} 
                                    onChange={(e) => handleInputChange(item.slotId, 'stock', e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Max Capacity</label>
                                <input 
                                    type="number" 
                                    className={styles.numberInput}
                                    // FIX: Pre-fills max, falls back to default
                                    value={editValues[item.slotId]?.max || item.max || 30}
                                    onChange={(e) => handleInputChange(item.slotId, 'max', e.target.value)}
                                />
                            </div>

                            <div className={`${styles.inputGroup} ${styles.priceInputGroup}`}>
                                <label className={styles.label}>Set Unit Price</label>
                                <input 
                                    type="number" 
                                    className={styles.numberInput}
                                    value={editValues[item.slotId]?.price ?? item.price ?? 0}
                                    onChange={(e) => handleInputChange(item.slotId, 'price', e.target.value)}
                                />
                            </div>
                        </div>

                        <button className={styles.updateBtn} onClick={() => handleUpdate(item.slotId)}>
                            Update Inventory
                        </button>
                    </div>
                ))}

            </div>
        </div>

        {/* --- PREMIUM TOAST NOTIFICATION --- */}
        {toast.show && (
            <div className={`${styles.toast} ${
                toast.type === 'error' ? styles.toastError : 
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