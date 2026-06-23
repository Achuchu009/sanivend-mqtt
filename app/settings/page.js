// app/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import Link from "next/link";
import styles from './settings.module.css';
import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// --- SVG ICONS ---
const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);
const SuccessIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#2A9D8F'}}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export default function SettingsPage() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch real-time error data to determine machine status
  const { data: errorData } = useSWR('/api/errors', fetcher, { refreshInterval: 5000 });
  const isMachineOnline = errorData ? errorData.isMachineConnected : null;

  // Form States
  const [accountSettings, setAccountSettings] = useState({ username: 'admin', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [machineConfig, setMachineConfig] = useState({ machineName: 'SANIVEND Unit 01', location: 'Building A, Floor 2', ssid: '', wifiPassword: '', serverIp: '' });
  const [thresholds, setThresholds] = useState({ slot1: 5, slot2: 10, slot3: 8, slot4: 5 });
  const [notifications, setNotifications] = useState({ lowStock: true, errors: true, popup: true });

  // Fetch settings from API on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.machineConfig) setMachineConfig(data.machineConfig);
          if (data.thresholds) setThresholds(data.thresholds);
          if (data.notifications) setNotifications(data.notifications);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Helper: Show Toast
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Save function interacting with API
  const handleSave = async (section) => {
    let payload = {};
    if (section === 'Account') {
      if (!accountSettings.currentPassword) {
        showToast("Current password is required!");
        return;
      }
      if (accountSettings.newPassword !== accountSettings.confirmPassword) {
        showToast("Passwords do not match!");
        return;
      }
      payload = { type: 'account', data: accountSettings };
    } else if (section === 'Configuration') {
      payload = { type: 'machine', data: machineConfig };
    } else if (section === 'Thresholds') {
      payload = { type: 'thresholds', data: thresholds };
    } else if (section === 'Notifications') {
      payload = { type: 'notifications', data: notifications };
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast(`${section} Updated Successfully!`);
      } else {
        const errData = await res.json();
        showToast(errData.error || `Failed to update ${section}`);
      }
    } catch (error) {
      console.error(error);
      showToast("An error occurred while saving.");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
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
          
        </nav>
        
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
            <Image className={styles.menuIcon} src="/menu-icon.svg" width={24} height={24} alt="Menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={styles.headerLeft}>
                <div className={styles.pageTitle}>SETTINGS</div>
            </div>
            <div className={styles.userProfile} onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} style={{position: 'relative', cursor: 'pointer'}}>
            <span>Admin</span>
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
            
            <div className={styles.settingsGrid}>
                
                {/* 1. ADMIN ACCOUNT SETTINGS */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Admin Account Settings</div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Change Username</label>
                        <input type="text" className={styles.inputField} placeholder="Enter username" value={accountSettings.username} onChange={e => setAccountSettings({...accountSettings, username: e.target.value})} />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Current Password</label>
                        <input type="password" className={styles.inputField} placeholder="Required for changes" value={accountSettings.currentPassword} onChange={e => setAccountSettings({...accountSettings, currentPassword: e.target.value})} />
                    </div>

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>New Password</label>
                            <input type="password" className={styles.inputField} placeholder="********" value={accountSettings.newPassword} onChange={e => setAccountSettings({...accountSettings, newPassword: e.target.value})} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Confirm Password</label>
                            <input type="password" className={styles.inputField} placeholder="********" value={accountSettings.confirmPassword} onChange={e => setAccountSettings({...accountSettings, confirmPassword: e.target.value})} />
                        </div>
                    </div>

                    <button className={styles.saveBtn} onClick={() => handleSave('Account')}>
                        <SaveIcon /> Update Account
                    </button>
                </div>

                {/* 2. STOCK THRESHOLD SETTINGS */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Stock Threshold Settings</div>
                    
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Slot 1 Low-Stock Limit</label>
                            <input type="number" className={styles.inputField} value={thresholds.slot1} onChange={e => setThresholds({...thresholds, slot1: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Slot 2 Low-Stock Limit</label>
                            <input type="number" className={styles.inputField} value={thresholds.slot2} onChange={e => setThresholds({...thresholds, slot2: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Slot 3 Low-Stock Limit</label>
                            <input type="number" className={styles.inputField} value={thresholds.slot3} onChange={e => setThresholds({...thresholds, slot3: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Slot 4 Low-Stock Limit</label>
                            <input type="number" className={styles.inputField} value={thresholds.slot4} onChange={e => setThresholds({...thresholds, slot4: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>

                    <button className={styles.saveBtn} onClick={() => handleSave('Thresholds')}>
                        <SaveIcon /> Save Thresholds
                    </button>
                </div>

                {/* 3. MACHINE CONFIGURATION */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Machine Configuration</div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Machine Name</label>
                        <input type="text" className={styles.inputField} value={machineConfig.machineName} onChange={e => setMachineConfig({...machineConfig, machineName: e.target.value})} />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Location</label>
                        <input type="text" className={styles.inputField} value={machineConfig.location} onChange={e => setMachineConfig({...machineConfig, location: e.target.value})} />
                    </div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>WiFi SSID</label>
                        <input type="text" className={styles.inputField} value={machineConfig.ssid} onChange={e => setMachineConfig({...machineConfig, ssid: e.target.value})} placeholder="Enter WiFi SSID" />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>WiFi Password</label>
                        <input type="password" className={styles.inputField} value={machineConfig.wifiPassword} onChange={e => setMachineConfig({...machineConfig, wifiPassword: e.target.value})} placeholder="Enter WiFi Password" />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Server IP</label>
                        <input type="text" className={styles.inputField} value={machineConfig.serverIp} onChange={e => setMachineConfig({...machineConfig, serverIp: e.target.value})} placeholder="e.g. 192.168.1.100" />
                    </div>
                    
                    <button className={styles.saveBtn} onClick={() => handleSave('Configuration')}>
                        <SaveIcon /> Save Changes
                    </button>
                </div>

                {/* 4. NOTIFICATION & SYSTEM INFO */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Notification Settings</div>
                    
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>Enable Low-Stock Alerts</span>
                        <label className={styles.switch}>
                            <input type="checkbox" checked={notifications.lowStock} onChange={e => setNotifications({...notifications, lowStock: e.target.checked})} />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>Enable Error Alerts</span>
                        <label className={styles.switch}>
                            <input type="checkbox" checked={notifications.errors} onChange={e => setNotifications({...notifications, errors: e.target.checked})} />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>Show Pop-up on Dashboard</span>
                        <label className={styles.switch}>
                            <input type="checkbox" checked={notifications.popup} onChange={e => {
                                const isChecked = e.target.checked;
                                setNotifications({
                                    ...notifications, 
                                    popup: isChecked, 
                                    lowStock: isChecked ? notifications.lowStock : false, 
                                    errors: isChecked ? notifications.errors : false
                                });
                            }} />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <button className={styles.saveBtn} onClick={() => handleSave('Notifications')} style={{marginTop: '16px'}}>
                        <SaveIcon /> Save Notifications
                    </button>
                    
                    <div style={{marginTop: '32px'}}></div>
                    
                    <div className={styles.cardTitle}>System Information</div>
                    <div className={styles.systemInfo}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Software Version</span>
                            <span className={styles.infoValue}>v1.0.0</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Machine Status</span>
                            {isMachineOnline === null ? (
                                <span className={styles.infoValue} style={{color: '#888'}}>Checking...</span>
                            ) : (
                                <span className={isMachineOnline ? styles.infoStatusOnline : styles.infoStatusOffline}>
                                    {isMachineOnline ? 'Online' : 'Offline'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* TOAST */}
        {toast.show && (
            <div className={styles.toast}>
                <span className={styles.toastIcon}><SuccessIcon /></span>
                <span className={styles.toastMessage}>{toast.message}</span>
            </div>
        )}

      </main>
    </div>
  );
};