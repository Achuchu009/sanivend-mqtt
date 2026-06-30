// app/sales/page.js
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import styles from './sales.module.css';
import useSWR from 'swr';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const fetcher = (...args) => fetch(...args).then(res => res.json());

// Premium Palette
const COLORS = ['#457B9D', '#2A9D8F', '#E9C46A', '#E63946'];

// --- SVG ICONS FOR TOAST ---
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

const SearchIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
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

export default function SalesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data, error } = useSWR(
    `/api/sales?month=${selectedMonth}&year=${selectedYear}`, 
    fetcher, 
    { refreshInterval: 2000 }
  );

  const [filterSlot, setFilterSlot] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { setCurrentPage(1); }, [filterSlot, filterPayment, selectedMonth, selectedYear, searchQuery]);

  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => {
          setToast((prev) => ({ ...prev, show: false }));
      }, 3000);
  };

  if (error) return <div className={styles.container}>Network Error</div>;
  if (!data) return (
    <div className="globalLoaderContainer">
      <div className="globalLoaderSpinner"></div>
      <div className="globalLoaderText">LOADING ANALYTICS...</div>
    </div>
  );

  const filteredSales = data.sales.filter(sale => {
    const matchSlot = filterSlot === 'All' || sale.slotId === filterSlot;
    const matchPayment = filterPayment === 'All' || sale.paymentMethod === filterPayment;
    
    const query = searchQuery.toLowerCase();
    const absoluteTime = formatFullTime(sale.createdAt).toLowerCase();
    const relativeTime = formatRelativeTime(sale.createdAt).toLowerCase();
    const matchSearch = !searchQuery || 
      (sale.itemName && sale.itemName.toLowerCase().includes(query)) ||
      (sale.slotId && sale.slotId.toLowerCase().includes(query)) ||
      absoluteTime.includes(query) ||
      relativeTime.includes(query);

    return matchSlot && matchPayment && matchSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (n) => setCurrentPage(n);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // --- 1. IBINALIK NATIN ANG PAGINATION TRUNCATION LOGIC DITO ---
  const getVisiblePages = (current, total) => {
    // Hanggang 5 pages lang bago lumabas ang "..."
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    
    const pages = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 2) end = 3;
    if (current >= total - 1) start = total - 2;

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");

    pages.push(total);
    return pages;
  };

  const visiblePages = getVisiblePages(currentPage, totalPages);
  // -------------------------------------------------------------

  // --- EXCEL EXPORT FUNCTION ---
  const handleExportExcel = async () => {
      if (!data || data.sales.length === 0) {
          showToast("No data to export.", "error");
          return;
      }

      showToast("Generating Report...", "info");

      try {
          const payload = {
              paymentStats: data.paymentStats,
              productStats: data.productStats,
              filteredSales: filteredSales,
              monthName: months[selectedMonth],
              year: selectedYear
          };

          const response = await fetch('/api/export-excel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error("Backend failed to generate file.");

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `SaniVend_Report_${months[selectedMonth]}_${selectedYear}.xlsx`;
          anchor.click();
          window.URL.revokeObjectURL(url);

          showToast("Report Exported!", "success");

      } catch (err) {
          console.error("Excel Export Error:", err);
          showToast("Failed to use template.", "error");
      }
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
          <div className={`${styles.navItem} ${styles.activeNavItem}`}>
            <Image src="/sales-icon.svg" width={20} height={20} alt="Sales" />
            <span>Transaction History</span>
          </div>
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
                <div className={styles.pageTitle}>SALES ANALYTICS</div>
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
            
            {/* DATE FILTER */}
            <div className={styles.dateFilterContainer}>
                <select className={styles.selectInput} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className={styles.selectInput} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
            </div>

            {/* SUMMARY CARDS */}
            <div className={styles.summarySection}>
                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.cardLabel}>Revenue ({months[selectedMonth]})</div>
                        <div className={styles.cardValue}>Php {Number(data.periodRevenue).toFixed(2)}</div>
                    </div>
                    <div className={styles.iconBox}>
                        <Image src="/sales-graph.svg" width={32} height={32} alt="Icon" />
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.cardLabel}>Items Sold</div>
                        <div className={styles.cardValue}>{data.periodItems}</div>
                    </div>
                    <div className={styles.iconBox}>
                        <Image src="/stock-icon.svg" width={32} height={32} alt="Icon" />
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.cardLabel}>Most Popular</div>
                        <div className={styles.cardValue} style={{fontSize:'20px'}}>{data.popularItem}</div>
                    </div>
                    <div className={styles.iconBox}>
                        <Image src="/user-profile.svg" width={32} height={32} alt="Icon" />
                    </div>
                </div>
            </div>

            {/* MAIN GRAPH */}
            <div className={styles.fullWidthChart}>
                <div className={styles.chartTitle}>Daily Sales Trend</div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={data.graphData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#457B9D" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#457B9D" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                            <XAxis 
                                dataKey="day" 
                                tick={{fontSize: 12, fill: '#666'}} 
                                axisLine={false} tickLine={false}
                                label={{ value: 'Day of Month', position: 'insideBottom', offset: -15, fill: '#999', fontSize: 11 }} 
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#666'}} 
                                axisLine={false} tickLine={false} 
                                tickFormatter={(value) => `₱${value}`}
                                label={{ value: 'Revenue', angle: -90, position: 'insideLeft', fill: '#999', fontSize: 11, offset: 10 }} 
                            />
                            <Tooltip labelFormatter={(label) => `Day ${label}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}} />
                            <Area type="monotone" dataKey="sales" stroke="#457B9D" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECONDARY GRAPHS */}
            <div className={styles.secondaryChartsGrid}>
                <div className={styles.chartCard}>
                    <div className={styles.chartTitle}>Payment Methods</div>
                    <div style={{ width: '100%', height: 220 }}>
                        {data.sales.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontStyle: 'italic', fontSize: '13px' }}>
                                No transaction data available for this month.
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie 
                                        data={data.paymentStats} cx="50%" cy="50%" 
                                        innerRadius={60} outerRadius={80} 
                                        paddingAngle={5} dataKey="value"
                                    >
                                        {data.paymentStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                    <Legend iconType="circle" iconSize={8} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartTitle}>Product Breakdown</div>
                    <div style={{ width: '100%', height: 220 }}>
                        {data.sales.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontStyle: 'italic', fontSize: '13px' }}>
                                No transaction data available for this month.
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <BarChart data={data.productStats} layout="vertical" margin={{left: 10, right: 10}}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#555'}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                    <Bar dataKey="value" fill="#2A9D8F" radius={[0, 6, 6, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* FILTER TOOLBAR */}
            <div className={styles.filterBar}>
                <div className={styles.filterLeft}>
                    <button 
                        onClick={handleExportExcel}
                        style={{
                            backgroundColor: '#1D6F42', color: 'white', border: 'none', padding: '7px 14px',
                            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export
                    </button>

                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Slot</span>
                        <select className={styles.selectInput} value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)}>
                            <option value="All">All Slots</option>
                            <option value="slot1">Slot 1</option>
                            <option value="slot2">Slot 2</option>
                            <option value="slot3">Slot 3</option>
                            <option value="slot4">Slot 4</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Payment</span>
                        <select className={styles.selectInput} value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
                            <option value="All">All Types</option>
                            <option value="Coins">Coins</option>
                            <option value="RFID">RFID Card</option>
                        </select>
                    </div>

                    <div className={styles.searchContainer}>
                        <SearchIcon />
                        <input 
                            type="text" 
                            placeholder="Search items, dates..." 
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className={styles.clearSearch} onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
                        )}
                    </div>
                </div>

                <span className={styles.filterMeta}>
                    {filteredSales.length} result{filteredSales.length !== 1 && 's'}
                </span>
            </div>

            {/* DATA TABLE */}
            <div className={styles.tableContainer}>
                <table className={styles.salesTable}>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Slot</th>
                            <th>Item Dispensed</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Payment Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((sale) => (
                            <tr key={sale.id} className={styles.tableRow}>
                                <td>
                                    <span className={styles.relTime} title={formatFullTime(sale.createdAt)}>
                                        {formatRelativeTime(sale.createdAt)}
                                    </span>
                                    <span className={styles.absTime}>
                                        {formatFullTime(sale.createdAt)}
                                    </span>
                                </td>
                                <td>{sale.slotId.replace('slot', 'Slot ')}</td>
                                <td>{sale.itemName}</td>
                                <td>{sale.quantity || 1}</td>
                                <td>Php {Number(sale.amount).toFixed(2)}</td>
                                <td>
                                    <span className={sale.paymentMethod === 'RFID' ? styles.badgeRfid : styles.badgeCash}>
                                        {sale.paymentMethod}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan="6">
                                    <div className={styles.emptyState}>
                                        <EmptyStateIcon />
                                        <p className={styles.emptyStateTitle}>No records found</p>
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

                {/* --- 2. IBINALIK NATIN ANG MAPPING SA VISIBLE PAGES DITO --- */}
                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <span className={styles.paginationMeta}>
                            {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredSales.length)} of {filteredSales.length}
                        </span>
                        <div className={styles.paginationBtns}>
                            <button className={styles.pageBtn} onClick={prevPage} disabled={currentPage === 1} aria-label="Previous">
                                <ChevronLeftIcon />
                            </button>
                            
                            {visiblePages.map((page, index) => (
                                page === "..." ? (
                                    <span key={index} className={styles.pageDots}>
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

                            <button className={styles.pageBtn} onClick={nextPage} disabled={currentPage === totalPages} aria-label="Next">
                                <ChevronRightIcon />
                            </button>
                        </div>
                    </div>
                )}
                {/* ----------------------------------------------------------- */}
            </div>

        </div>

        {/* TOAST UI COMPONENT */}
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