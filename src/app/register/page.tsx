'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabaseClient';

export default function Register() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Регистрация в Supabase Auth
      const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.msg || authData.message || 'Ошибка регистрации');

      // 2. Добавление записи в public.users
      const userId = authData.user?.id;
      if (userId) {
        await fetch(`${supabaseUrl}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ id: userId, email, business_name: businessName })
        });

        // 3. Сохранение сессии локально
        localStorage.setItem('vesta_token', authData.access_token);
        localStorage.setItem('vesta_user_id', userId);
        
        router.push('/dashboard');
      } else {
        throw new Error('Пользователь не создан');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Создать аккаунт</h1>
          <p className={styles.subtitle}>Начните бесплатный 14-дневный период. Кредитная карта не требуется.</p>
        </div>

        {error && <div style={{color: '#ef4444', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '0.5rem', fontSize: '0.9rem'}}>{error}</div>}

        <form className={styles.form} onSubmit={handleRegister}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="businessName">Название Бизнеса</label>
            <input 
              type="text" id="businessName" className={styles.input} 
              placeholder="Например: Студия красоты 'Атмосфера'" required 
              value={businessName} onChange={e => setBusinessName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email / Логин</label>
            <input 
              type="email" id="email" className={styles.input} 
              placeholder="name@example.com" required 
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input 
              type="password" id="password" className={styles.input} 
              placeholder="••••••••" required minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.footer}>
          Уже есть аккаунт?
          <Link href="/login" className={styles.link}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
