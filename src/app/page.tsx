import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      
      <main className={styles.main}>
        <div className={styles.badge}>
          🎉 Платформа VestaBots
        </div>
        
        <h1 className={styles.title}>
          Создайте бота для бизнеса <br/> без единой строчки кода
        </h1>
        
        <p className={styles.description}>
          Автоматизируйте запись клиентов. Подключите Kaspi QR, настройте онлайн-календарь и запустите Telegram-ассистента всего за 5 минут.
        </p>
        
        <div className={styles.actions}>
          <Link href="/register" className={styles.primaryButton}>
            Создать Бота
          </Link>
          <Link href="/login" className={styles.secondaryButton}>
            Войти в кабинет
          </Link>
        </div>
      </main>
    </div>
  );
}
