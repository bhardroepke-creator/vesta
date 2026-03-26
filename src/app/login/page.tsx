'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Неверный email или пароль');
      
      if (data.user && data.access_token) {
        localStorage.setItem('vesta_token', data.access_token);
        localStorage.setItem('vesta_user_id', data.user.id);
        router.push('/dashboard');
      }
    } catch(err: any) {
      alert('Ошибка входа: ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>С возвращением</h1>
          <p className={styles.subtitle}>Войдите, чтобы управлять вашим ботом</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input} 
              placeholder="name@example.com" 
              required 
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input} 
              placeholder="••••••••" 
              required 
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            Войти в панель
          </button>
        </form>

        <div className={styles.footer}>
          Нет аккаунта?
          <Link href="/register" className={styles.link}>
            Создать сейчас
          </Link>
        </div>
      </div>
    </div>
  );
}
