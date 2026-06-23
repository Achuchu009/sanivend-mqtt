// app/errors/page.js
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import styles from './errors.module.css';
import useSWR, { mutate } from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// --- SVG ICONS ---
const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);
const FilterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#555' }}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);
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

export default function ErrorPage() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ show: false, ids: [] });
  const [selectedIds, setSelectedIds] = useState([]); 

  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data, error } = useSWR('/api/errors', fetcher, { refreshInterval: 2000 });

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]); 
  }, [filterStatus, searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  const logs = data?.logs || [];

  const filteredLogs = logs.filter(log => {
      let statusMatch = true;
      if (filterStatus === 'Open') statusMatch = log.status === 'Open';
      if (filterStatus === 'Resolved') statusMatch = log.status === 'Resolved';

      let searchMatch = true;
      if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          searchMatch = log.errorCode.toLowerCase().includes(query) || 
                        log.message.toLowerCase().includes(query);
      }

      return statusMatch && searchMatch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (n) => setCurrentPage(n);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // WAG ISAMA SA BULK DELETE ANG NET_01 NA NAKA-OPEN
      const idsOnPage = currentItems
          .filter(log => !(log.errorCode === 'NET_01' && log.status === 'Open'))
          .map(log => log.id);
      setSelectedIds(idsOnPage);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Open' ? 'Resolved' : 'Open';
    try {
      await fetch('/api/errors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      mutate('/api/errors'); 
      showToast(`Status updated to ${newStatus}`, "success");
    } catch (err) { showToast("Server Error", "error"); }
  };

  const initiateDelete = (ids) => {
    setDeleteModal({ show: true, ids: Array.isArray(ids) ? ids : [ids] });
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch('/api/errors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteModal.ids })
      });

      if (res.ok) {
        mutate('/api/errors'); 
        setSelectedIds([]); 
        showToast("Logs deleted successfully", "success");
      } else {
        showToast("Failed to delete", "error");
      }
    } catch (err) {
      showToast("Server Error", "error");
    } finally {
      setDeleteModal({ show: false, ids: [] });
    }
  };

  const isMachineOnline = data ? data.isMachineConnected : true;
  const activeErrors = data?.activeCount || 0;
  
  const healthStatus = activeErrors === 0 ? "Fully Operational" : "Attention Required";
  
  const healthColor = activeErrors === 0 ? styles.textGreen : styles.textRed;
  const connectionColor = isMachineOnline ? styles.textGreen : styles.textRed;

  const getVisiblePages = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    
    const pages = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 3) end = 4;
    if (current >= total - 2) start = total - 3;

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");

    pages.push(total);
    return pages;
  };

  const visiblePages = getVisiblePages(currentPage, totalPages);

  if (error) return <div className={styles.container}>Network Error</div>;
  if (!data) return <div className={styles.container} style={{justifyContent:'center', alignItems:'center'}}>Loading Error Logs...</div>;

  return (
    <div className={styles.container}>
      
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
          <div className={`${styles.navItem} ${styles.activeNavItem}`}>
            <Image src="/error-icon.svg" width={20} height={20} alt="Errors" />
            <span>Error Alerts</span>
          </div>
          
        </nav>
        
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
            <Image className={styles.menuIcon} src="/menu-icon.svg" width={24} height={24} alt="Menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={styles.headerLeft}>
                <div className={styles.pageTitle}>ERROR ALERTS</div>
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
            
            <div className={styles.summarySection}>
                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.cardLabel}>Connection Status</div>
                        <div className={`${styles.cardValue} ${connectionColor}`}>
                            <span className={styles.largeDot} style={{backgroundColor: isMachineOnline ? '#2A9D8F' : '#E63946'}}></span>
                            {isMachineOnline ? "System Online" : "Machine Offline"}
                        </div>
                    </div>
                    <div className={styles.iconBox}>
                        <Image src="/settings-icon.svg" width={32} height={32} alt="Icon" />
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.cardLabel}>Operational Status</div>
                        <div className={`${styles.cardValue} ${healthColor}`}>
                            {healthStatus}
                        </div>
                    </div>
                    <div className={styles.iconBox}>
                        <Image src="/error-icon.svg" width={32} height={32} alt="Icon" />
                    </div>
                </div>
            </div>

            <div className={styles.filterBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div className={styles.filterLeft} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FilterIcon />
                        <span className={styles.filterLabel}>Status:</span>
                        <select 
                            className={styles.selectInput} 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Open">Unresolved (Open)</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>

                    <div className={styles.searchContainer}>
                        <SearchIcon />
                        <input 
                            type="text" 
                            className={styles.searchInput}
                            placeholder="Search code or message..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <button className={styles.bulkDeleteBtn} onClick={() => initiateDelete(selectedIds)}>
                        <TrashIcon />
                        Delete Selected ({selectedIds.length})
                    </button>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.errorTable}>
                    <thead>
                        <tr>
                            <th style={{width: '50px', textAlign: 'center'}}>
                                <input 
                                    type="checkbox" 
                                    className={styles.checkbox}
                                    onChange={handleSelectAll}
                                    checked={currentItems.length > 0 && selectedIds.length === currentItems.filter(log => !(log.errorCode === 'NET_01' && log.status === 'Open')).length}
                                />
                            </th>
                            <th>Timestamp</th>
                            <th>Error Code</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((log) => (
                            <tr key={log.id}>
                                <td style={{textAlign: 'center'}}>
                                    {/* GINAMITAN NG VISIBILITY HIDDEN PARA HINDI MAWALA YUNG ALIGNMENT NG CHECKBOXES */}
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            className={styles.checkbox}
                                            checked={selectedIds.includes(log.id)}
                                            onChange={() => handleSelectOne(log.id)}
                                            style={{ visibility: (log.errorCode === 'NET_01' && log.status === 'Open') ? 'hidden' : 'visible' }}
                                        />
                                    </div>
                                </td>
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                <td><span className={styles.codeBadge}>{log.errorCode}</span></td>
                                <td className={styles.messageCell}>{log.message}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${
                                        log.status === 'Resolved' ? styles.statusResolved : 
                                        log.errorCode.startsWith('CHG') ? styles.statusChange : 
                                        styles.statusOpen
                                    }`}>
                                        {log.status === 'Open' && log.errorCode.startsWith('CHG') ? 'Change Due' : log.status}
                                    </span>
                                </td>
                                
                                <td className={styles.actionCell}>
                                    <div className={styles.actionWrapper}>
                                        
                                        {/* STRICT WIDTH DIV KAPAG NAKA NET_01 OPEN */}
                                        {log.errorCode === 'NET_01' ? (
                                            log.status === 'Open' ? (
                                                <div style={{ width: '100px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', color: '#E63946', fontStyle: 'italic', fontWeight: '800' }}>
                                                    Reconnecting...
                                                </div>
                                            ) : (
                                                <div style={{ width: '100px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                                                    Resolved
                                                </div>
                                            )
                                        ) : (
                                            <button 
                                                className={log.status === 'Open' ? styles.resolveBtn : styles.reopenBtn}
                                                onClick={() => handleToggleStatus(log.id, log.status)}
                                                title={log.status === 'Open' ? 'Mark Resolved' : 'Re-open'}
                                            >
                                                {log.status === 'Open' ? <CheckIcon /> : <RefreshIcon />}
                                                <span>{log.status === 'Open' ? 'Resolve' : 'Re-open'}</span>
                                            </button>
                                        )}

                                        {/* VISIBILITY HIDDEN PARA PANTAY PARIN YUNG BASURAHAN SA IBANG ROWS */}
                                        <button 
                                            className={styles.deleteBtn}
                                            onClick={() => initiateDelete(log.id)}
                                            title="Delete Log"
                                            style={{ visibility: (log.errorCode === 'NET_01' && log.status === 'Open') ? 'hidden' : 'visible' }}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'30px', color: '#888', fontStyle: 'italic'}}>No logs found matching filter.</td></tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button className={styles.pageBtn} onClick={prevPage} disabled={currentPage === 1}>&lt;</button>
                        
                        {visiblePages.map((page, index) => (
                            page === "..." ? (
                                <span key={index} style={{ padding: '0 10px', color: '#888', display: 'flex', alignItems: 'center' }}>
                                    ...
                                </span>
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

                        <button className={styles.pageBtn} onClick={nextPage} disabled={currentPage === totalPages}>&gt;</button>
                    </div>
                )}
            </div>

        </div>

        {deleteModal.show && (
            <div className={styles.modalOverlay}>
                <div className={styles.modalCard}>
                    <div className={styles.modalTitle}>Confirm Deletion</div>
                    <p className={styles.modalText}>
                        Are you sure you want to delete {deleteModal.ids.length} log(s)? 
                        <br/>This action cannot be undone.
                    </p>
                    <div className={styles.modalActions}>
                        <button 
                            className={styles.btnCancelModal} 
                            onClick={() => setDeleteModal({ show: false, ids: [] })}
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

        {toast.show && (
            <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                <span className={styles.toastIcon}>
                    {toast.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
                </span>
                <span className={styles.toastMessage}>{toast.message}</span>
            </div>
        )}

      </main>
    </div>
  );
}