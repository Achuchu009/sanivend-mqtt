// app/errors/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import Link from "next/link";
import styles from './errors.module.css';
import useSWR, { mutate } from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// ─── SVG ICONS ────────────────────────────────────────────────────────────────

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

const SearchIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const SuccessIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2A9D8F' }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const ErrorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E63946' }}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);

const DotsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
        <circle cx="12" cy="19" r="1.5"></circle>
    </svg>
);

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

function getErrorSeverity(errorCode) {
    if (!errorCode) return 'default1';
    if (errorCode.startsWith('NET')) return 'net';
    if (errorCode.startsWith('JAM')) return 'jam';
    if (errorCode.startsWith('CHG')) return 'chg';
    if (errorCode.startsWith('SYS')) return 'sys';
    if (errorCode.startsWith('SENS')) return 'sens';
    
    // Hash based color for any other code
    const colors = ['default1', 'default2', 'default3', 'default4', 'default5'];
    let hash = 0;
    for (let i = 0; i < errorCode.length; i++) {
        hash = errorCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getStatusLabel(log) {
    if (log.status === 'Resolved') return 'Resolved';
    if (log.errorCode.startsWith('CHG')) return 'Change Due';
    return 'Open';
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ErrorPage() {
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [deleteModal, setDeleteModal] = useState({ show: false, ids: [] });
    const [selectedIds, setSelectedIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [detailLog, setDetailLog] = useState(null);

    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const menuRef = useRef(null);
    const { data, error } = useSWR('/api/errors', fetcher, { refreshInterval: 2000 });

    // Reset page/selection when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [filterStatus, searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── TOAST ──────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    // ─── DATA ───────────────────────────────────────────────────────────────
    const logs = data?.logs || [];

    const filteredLogs = logs.filter(log => {
        let statusMatch = true;
        if (filterStatus === 'Open') statusMatch = log.status.startsWith('Open');
        if (filterStatus === 'Resolved') statusMatch = log.status === 'Resolved';

        let searchMatch = true;
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const formattedTime = formatFullTime(log.timestamp).toLowerCase();
            const relativeTime = formatRelativeTime(log.timestamp).toLowerCase();
            searchMatch = log.errorCode.toLowerCase().includes(query) ||
                log.message.toLowerCase().includes(query) ||
                formattedTime.includes(query) ||
                relativeTime.includes(query);
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

    // ─── SELECTION ──────────────────────────────────────────────────────────
    const selectableItems = currentItems.filter(
        log => !(log.errorCode === 'NET_01' && log.status.startsWith('Open'))
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(selectableItems.map(log => log.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const isAllSelected = selectableItems.length > 0 && selectedIds.length === selectableItems.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < selectableItems.length;

    // ─── ACTIONS ────────────────────────────────────────────────────────────
    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus.startsWith('Open') ? 'Resolved' : 'Open';
        setOpenMenuId(null);
        try {
            await fetch('/api/errors', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            mutate('/api/errors');
            showToast(`Status updated to ${newStatus}`, 'success');
        } catch (err) { showToast('Server Error', 'error'); }
    };

    const initiateDelete = (ids) => {
        setOpenMenuId(null);
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
                showToast('Logs deleted successfully', 'success');
            } else {
                showToast('Failed to delete', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        } finally {
            setDeleteModal({ show: false, ids: [] });
        }
    };

    // ─── STATUS INDICATORS ──────────────────────────────────────────────────
    const isMachineOnline = data ? data.isMachineConnected : true;
    const activeErrors = data?.activeCount || 0;
    const healthStatus = activeErrors === 0 ? 'Fully Operational' : 'Attention Required';

    // ─── PAGINATION ─────────────────────────────────────────────────────────
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

    // ─── LOADING / ERROR STATES ─────────────────────────────────────────────
    if (error) return (
        <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', color: '#E63946' }}>
                <ErrorIcon />
                <p style={{ marginTop: '12px', fontWeight: 600 }}>Failed to load error logs</p>
            </div>
        </div>
    );
    if (!data) return (
        <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className={styles.loadingSpinner}></div>
        </div>
    );

    // ─── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className={styles.container}>

            {/* ── SIDEBAR ───────────────────────────────────────────── */}
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

            {/* ── MAIN CONTENT ──────────────────────────────────────── */}
            <main className={styles.mainContent}>

                {/* ── HEADER ────────────────────────────────────────── */}
                <header className={styles.header}>
                    <Image
                        className={styles.menuIcon}
                        src="/menu-icon.svg"
                        width={24} height={24} alt="Menu"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                    <div className={styles.headerLeft}>
                        <div className={styles.pageTitle}>ERROR ALERTS</div>
                        {activeErrors > 0 && (
                            <span className={styles.activeErrorsBadge}>{activeErrors} active</span>
                        )}
                    </div>
                    <div
                        className={styles.userProfile}
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        onBlur={() => setTimeout(() => setIsProfileDropdownOpen(false), 200)}
                        tabIndex={0}
                        style={{ position: 'relative', cursor: 'pointer', outline: 'none' }}
                    >
                        <Image src="/user-profile.svg" width={30} height={30} alt="User" />
                        {isProfileDropdownOpen && (
                            <div className="profileDropdown">
                                <div className="dropdownItem" onClick={() => window.location.href = '/settings'}>Settings</div>
                                <div className="dropdownItem" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; }}>Logout</div>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── CONTENT ───────────────────────────────────────── */}
                <div className={styles.contentArea}>

                    {/* ── SUMMARY CARDS ─────────────────────────────── */}
                    <div className={styles.summarySection}>
                        <div className={styles.summaryCard}>
                            <div>
                                <div className={styles.cardLabel}>Connection Status</div>
                                <div className={`${styles.cardValue} ${isMachineOnline ? styles.textGreen : styles.textRed}`}>
                                    <span className={styles.pulseDot} style={{ '--dot-color': isMachineOnline ? '#2A9D8F' : '#E63946' }}></span>
                                    {isMachineOnline ? 'System Online' : 'Machine Offline'}
                                </div>
                            </div>
                            <div className={`${styles.iconBox} ${isMachineOnline ? styles.iconBoxGreen : styles.iconBoxRed}`}>
                                <Image src="/settings-icon.svg" width={28} height={28} alt="Icon" />
                            </div>
                        </div>

                        <div className={styles.summaryCard}>
                            <div>
                                <div className={styles.cardLabel}>Operational Status</div>
                                <div className={`${styles.cardValue} ${activeErrors === 0 ? styles.textGreen : styles.textRed}`}>
                                    {healthStatus}
                                </div>
                                {activeErrors > 0 && (
                                    <div className={styles.cardSubtext}>{activeErrors} error{activeErrors !== 1 ? 's' : ''} need attention</div>
                                )}
                            </div>
                            <div className={`${styles.iconBox} ${activeErrors === 0 ? styles.iconBoxGreen : styles.iconBoxRed}`}>
                                <Image src="/error-icon.svg" width={28} height={28} alt="Icon" />
                            </div>
                        </div>
                    </div>

                    {/* ── FILTER BAR ────────────────────────────────── */}
                    <div className={styles.filterBar}>
                        <div className={styles.filterLeft}>
                            <div className={styles.filterGroup}>
                                <FilterIcon />
                                <span className={styles.filterLabel}>Filter</span>
                                <div className={styles.filterPills}>
                                    {['All', 'Open', 'Resolved'].map(s => (
                                        <button
                                            key={s}
                                            className={`${styles.filterPill} ${filterStatus === s ? styles.filterPillActive : ''}`}
                                            onClick={() => setFilterStatus(s)}
                                        >
                                            {s === 'Open' ? 'Unresolved' : s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.searchContainer}>
                                <SearchIcon />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search code or message…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>✕</button>
                                )}
                            </div>
                        </div>

                        <div className={styles.filterMeta}>
                            {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* ── BULK ACTION BAR ───────────────────────────── */}
                    {selectedIds.length > 0 && (
                        <div className={styles.bulkBar}>
                            <span className={styles.bulkCount}>{selectedIds.length} row{selectedIds.length !== 1 ? 's' : ''} selected</span>
                            <button className={styles.bulkDeleteBtn} onClick={() => initiateDelete(selectedIds)}>
                                <TrashIcon />
                                Delete Selected
                            </button>
                            <button className={styles.bulkClearBtn} onClick={() => setSelectedIds([])}>
                                Clear
                            </button>
                        </div>
                    )}

                    {/* ── TABLE ─────────────────────────────────────── */}
                    <div className={styles.tableContainer}>
                        <table className={styles.errorTable}>
                            <thead>
                                <tr>
                                    <th className={styles.thCheck}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            onChange={handleSelectAll}
                                            checked={isAllSelected}
                                            ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                        />
                                    </th>
                                    <th>Timestamp</th>
                                    <th>Error Code</th>
                                    <th>Message</th>
                                    <th>Status</th>
                                    <th className={styles.thAction}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((log, index) => {
                                    const isNet01Open = log.errorCode === 'NET_01' && log.status.startsWith('Open');
                                    const isOpen = log.status.startsWith('Open');
                                    const severity = getErrorSeverity(log.errorCode);
                                    const statusLabel = getStatusLabel(log);
                                    const isMenuOpen = openMenuId === log.id;

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`${styles.tableRow} ${selectedIds.includes(log.id) ? styles.rowSelected : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <td className={styles.tdCheck}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedIds.includes(log.id)}
                                                    onChange={() => handleSelectOne(log.id)}
                                                    style={{ visibility: isNet01Open ? 'hidden' : 'visible' }}
                                                />
                                            </td>

                                            {/* Timestamp */}
                                            <td>
                                                <span className={styles.relTime} title={formatFullTime(log.timestamp)}>
                                                    {formatRelativeTime(log.timestamp)}
                                                </span>
                                                <span className={styles.absTime}>{formatFullTime(log.timestamp)}</span>
                                            </td>

                                            {/* Error Code */}
                                            <td>
                                                <span className={`${styles.codeBadge} ${styles[`codeBadge_${severity}`]}`}>
                                                    {log.errorCode}
                                                </span>
                                            </td>

                                            {/* Message */}
                                            <td className={styles.messageCell}>
                                                <span className={styles.messageText}>{log.message}</span>
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <span className={`${styles.statusBadge} ${
                                                    log.status === 'Resolved' ? styles.statusResolved :
                                                    log.errorCode.startsWith('CHG') ? styles.statusChange :
                                                    styles.statusOpen
                                                }`}>
                                                    {statusLabel}
                                                </span>
                                            </td>

                                            {/* Action — three-dot menu */}
                                            <td className={styles.tdAction}>
                                                {isNet01Open ? (
                                                    <span className={styles.reconnectingLabel}>Reconnecting…</span>
                                                ) : (
                                                    <div className={styles.menuWrapper} ref={isMenuOpen ? menuRef : null}>
                                                        <button
                                                            id={`menu-btn-${log.id}`}
                                                            className={`${styles.dotsBtn} ${isMenuOpen ? styles.dotsBtnActive : ''}`}
                                                            onClick={() => setOpenMenuId(isMenuOpen ? null : log.id)}
                                                            aria-label="Actions"
                                                        >
                                                            <DotsIcon />
                                                        </button>

                                                        {isMenuOpen && (
                                                            <div className={(index >= currentItems.length - 2 && index >= 2) ? styles.actionDropdownUp : styles.actionDropdown}>
                                                                <button
                                                                    className={styles.dropdownMenuItem}
                                                                    onClick={() => { setDetailLog(log); setOpenMenuId(null); }}
                                                                >
                                                                    <EyeIcon />
                                                                    <span>View Details</span>
                                                                </button>

                                                                {/* "Reopen Error" is blocked only for NET_01;
                                                                    all other error codes can always be reopened */}
                                                                {(isOpen || log.errorCode !== 'NET_01') && (
                                                                    <button
                                                                        className={styles.dropdownMenuItem}
                                                                        onClick={() => handleToggleStatus(log.id, log.status)}
                                                                    >
                                                                        {isOpen ? <CheckIcon /> : <RefreshIcon />}
                                                                        <span>{isOpen ? 'Mark as Resolved' : 'Reopen Error'}</span>
                                                                    </button>
                                                                )}

                                                                <div className={styles.dropdownDivider}></div>

                                                                <button
                                                                    className={`${styles.dropdownMenuItem} ${styles.dropdownMenuItemDanger}`}
                                                                    onClick={() => initiateDelete(log.id)}
                                                                >
                                                                    <TrashIcon />
                                                                    <span>Delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Empty State */}
                                {currentItems.length === 0 && (
                                    <tr>
                                        <td colSpan="6">
                                            <div className={styles.emptyState}>
                                                <EmptyStateIcon />
                                                <p className={styles.emptyStateTitle}>No logs found</p>
                                                <p className={styles.emptyStateText}>
                                                    {searchQuery
                                                        ? `No results for "${searchQuery}". Try a different search.`
                                                        : 'No error logs match the current filter.'}
                                                </p>
                                                {(searchQuery || filterStatus !== 'All') && (
                                                    <button className={styles.emptyStateClear} onClick={() => { setSearchQuery(''); setFilterStatus('All'); }}>
                                                        Clear filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ── PAGINATION ──────────────────────────────── */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <span className={styles.paginationMeta}>
                                    {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length}
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

                {/* ── VIEW DETAILS MODAL ────────────────────────────── */}
                {detailLog && (
                    <div className={styles.modalOverlay} onClick={() => setDetailLog(null)}>
                        <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
                            <div className={styles.detailHeader}>
                                <div>
                                    <span className={`${styles.codeBadge} ${styles[`codeBadge_${getErrorSeverity(detailLog.errorCode)}`]}`} style={{ fontSize: '13px', padding: '5px 10px' }}>
                                        {detailLog.errorCode}
                                    </span>
                                    <h2 className={styles.detailTitle}>Error Details</h2>
                                </div>
                                <button className={styles.detailCloseBtn} onClick={() => setDetailLog(null)}>
                                    <CloseIcon />
                                </button>
                            </div>
                            <div className={styles.detailBody}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Status</span>
                                    <span className={`${styles.statusBadge} ${
                                        detailLog.status === 'Resolved' ? styles.statusResolved :
                                        detailLog.errorCode.startsWith('CHG') ? styles.statusChange :
                                        styles.statusOpen
                                    }`}>{getStatusLabel(detailLog)}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Timestamp</span>
                                    <span className={styles.detailValue}>{formatFullTime(detailLog.timestamp)}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Error Code</span>
                                    <span className={styles.detailValue}>{detailLog.errorCode}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Message</span>
                                    <span className={styles.detailValue}>{detailLog.message}</span>
                                </div>
                                {detailLog.slotId && (
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>Slot ID</span>
                                        <span className={styles.detailValue}>{detailLog.slotId}</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles.detailFooter}>
                                {/* Hide the action button for NET_01 open rows.
                                    Also block "Reopen Error" specifically for NET_01 resolved errors. */}
                                {!(detailLog.errorCode === 'NET_01' && detailLog.status.startsWith('Open')) &&
                                 (detailLog.status.startsWith('Open') || detailLog.errorCode !== 'NET_01') && (
                                    <button
                                        className={styles.detailActionBtn}
                                        onClick={() => handleToggleStatus(detailLog.id, detailLog.status)}
                                    >
                                        {detailLog.status.startsWith('Open') ? <><CheckIcon /> Mark as Resolved</> : <><RefreshIcon /> Reopen Error</>}
                                    </button>
                                )}
                                <button className={styles.detailCancelBtn} onClick={() => setDetailLog(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── DELETE CONFIRM MODAL ──────────────────────────── */}
                {deleteModal.show && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalCard}>
                            <div className={styles.modalIconWrap}>
                                <TrashIcon />
                            </div>
                            <div className={styles.modalTitle}>Delete {deleteModal.ids.length} Log{deleteModal.ids.length !== 1 ? 's' : ''}?</div>
                            <p className={styles.modalText}>
                                This action is permanent and cannot be undone.
                            </p>
                            <div className={styles.modalActions}>
                                <button className={styles.btnCancelModal} onClick={() => setDeleteModal({ show: false, ids: [] })}>
                                    Cancel
                                </button>
                                <button className={styles.btnConfirmModal} onClick={confirmDelete}>
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TOAST ─────────────────────────────────────────── */}
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
