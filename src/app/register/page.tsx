import Link from "next/link";
import styles from "./page.module.css";

export default function Register() {
  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Создать аккаунт</h1>
          <p className={styles.subtitle}>Начните бесплатный 14-дневный период. Кредитная карта не требуется.</p>
        </div>

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="businessName">Название Бизнеса</label>
            <input 
              type="text" 
              id="businessName" 
              className={styles.input} 
              placeholder="Например: Студия красоты 'Атмосфера'" 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
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
              className={styles.input} 
              placeholder="••••••••" 
              required 
              minLength={8}
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            Зарегистрироваться
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
