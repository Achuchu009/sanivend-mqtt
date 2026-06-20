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
                <input 
                    type="password" 
                    className={styles.inputField} 
                    placeholder="************" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            {/* Error Message */}
            {error && <div style={{color: 'red', fontSize: '13px', textAlign: 'center'}}>{error}</div>}

            <button type="submit" className={styles.loginButton}>
                Login
            </button>

            <div className={styles.forgotPassword}>
                Forgot password?
            </div>

        </form>

        {/* FOOTER */}
        <div className={styles.footerVersion}>
            Local Dashboard v1.0
        </div>

      </div>
    </div>
  );
};