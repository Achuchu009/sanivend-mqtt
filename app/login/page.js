// app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import Image from "next/image";
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard'); 
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error, please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        
        {/* LOGO AREA */}
        <div className={styles.logoSection}>
            <Image 
                className={styles.logoIcon} 
                src="/logo.png" 
                width={100} 
                height={100} 
                alt="Sanivend Logo" 
            />
            <div className={styles.sanivend}>
                <span>SANI</span><span className={styles.vend}>VEND</span>
            </div>
        </div>

        {/* WELCOME TEXT */}
        <div className={styles.welcomeText}>
            <div className={styles.welcomeTitle}>Welcome back!</div>
            <div className={styles.loginTitle}>Login to your account</div>
        </div>

        {/* FORM INPUTS */}
        <form onSubmit={handleLogin} className={styles.form}>
            
            <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input 
                    type="text" 
                    className={styles.inputField} 
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required 
                />
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordContainer}>
                    <input 
                        type={showPassword ? "text" : "password"} 
                        className={styles.inputField} 
                        placeholder="************" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <div className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && <div style={{color: 'red', fontSize: '13px', textAlign: 'center'}}>{error}</div>}

            <button type="submit" className={styles.loginButton}>
                Login
            </button>

            <div className={styles.forgotPassword} onClick={() => setShowForgotModal(true)}>
                Forgot password?
            </div>

        </form>

        {/* FOOTER */}
        <div className={styles.footerVersion}>
            Local Dashboard v1.0
        </div>

      </div>

      {/* CUSTOM FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className={styles.modalOverlay} onClick={() => setShowForgotModal(false)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </div>
                <div className={styles.modalTitle}>Administrator Access</div>
                <div className={styles.modalText}>
                    Please contact the system administrator to securely reset your password.
                </div>
                <button className={styles.modalButton} onClick={() => setShowForgotModal(false)}>
                    Understood
                </button>
            </div>
        </div>
      )}
    </div>
  );
};