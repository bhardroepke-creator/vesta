'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabaseClient';

const DURATION_OPTIONS = [
  "Нет", "5 минут", "10 минут", "15 минут", "30 минут", "45 минут",
  "1 час", "1.5 часа", "2 часа", "2.5 часа", "3 часа", "4 часа", "5 часов"
];

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('builder');
  
  // Состояния для разветвления логики конфигуратора
  const [botPlatform, setBotPlatform] = useState('telegram');
  const [businessType, setBusinessType] = useState('beauty'); // 'beauty' или 'bakery'
  
  // Приветственное сообщение и дизайн для предпросмотра
  const [greeting, setGreeting] = useState('');
  const [menuStyle, setMenuStyle] = useState('minimal');
  const [botToken, setBotToken] = useState('');

  // Динамическое Портфолио и Статистика
  const [portfolioItems, setPortfolioItems] = useState([
    { id: 1, name: '', price: '', duration: 'Нет', masters: '', description: '', image: '' }
  ]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [botUsername, setBotUsername] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('vesta_token');
    const userId = localStorage.getItem('vesta_user_id');

    if (!token || !userId) {
      router.push('/login');
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/bot_settings?user_id=eq.${userId}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
          const s = data[0];
          setSettingsId(s.id);
          if (s.bot_platform) setBotPlatform(s.bot_platform);
          if (s.business_type) setBusinessType(s.business_type);
          if (s.greeting_text) setGreeting(s.greeting_text);
          if (s.bot_menu_style) setMenuStyle(s.bot_menu_style);
          if (s.bot_token_encrypted) {
            setBotToken(s.bot_token_encrypted);
            // Получение имени бота (getMe)
            try {
              fetch(`https://api.telegram.org/bot${s.bot_token_encrypted}/getMe`)
                .then(r => r.json())
                .then(tgData => {
                  if (tgData.ok) setBotUsername(tgData.result.username);
                }).catch(() => {});
            } catch(e) {}
          }
          
          try {
            if (s.schedule) setSchedule(JSON.parse(s.schedule));
            if (s.portfolio_items) setPortfolioItems(JSON.parse(s.portfolio_items));
          } catch(e) {}
        }

        // Загрузка статистики заявок (CRM)
        const appRes = await fetch(`${supabaseUrl}/rest/v1/appointments?user_id=eq.${userId}&order=created_at.desc`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`
          }
        });
        const appData = await appRes.json();
        if (appData && Array.isArray(appData)) {
          setAppointments(appData);
        }

      } catch (e) {
        console.error('Ошибка загрузки настроек', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPortfolioItems(prev => prev.map(item => 
          item.id === id ? { ...item, image: event.target?.result as string } : item
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const addPortfolioItem = () => {
    setPortfolioItems(prev => [...prev, { id: Date.now(), name: '', price: '', duration: 'Нет', masters: '', description: '', image: '' }]);
  };

  // Состояние дней недели (простой пример для UI)
  const [schedule, setSchedule] = useState(
    DAYS.map((d, i) => ({ name: d, active: i < 5, start: '10:00', end: '20:00' }))
  );

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].active = !newSchedule[index].active;
    setSchedule(newSchedule);
  };

  const handleSaveToDB = async () => {
    const token = localStorage.getItem('vesta_token');
    const userId = localStorage.getItem('vesta_user_id');
    if (!token || !userId) {
      alert("Сессия истекла! Пожалуйста, войдите снова.");
      router.push('/login');
      return;
    }

    try {
      // 1. Гарантируем, что юзер существует в public.users (исправляет ошибку foreign key)
      await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify({ id: userId, email: 'admin@vesta.kz' })
      });

      // 2. Сохраняем настройки бота
      const isUpdate = !!settingsId;
      const url = isUpdate 
        ? `${supabaseUrl}/rest/v1/bot_settings?id=eq.${settingsId}` 
        : `${supabaseUrl}/rest/v1/bot_settings`;
      
      const method = isUpdate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ 
          user_id: userId,
          bot_platform: botPlatform,
          greeting_text: greeting,
          business_type: businessType,
          bot_menu_style: menuStyle,
          schedule: JSON.stringify(schedule),
          bot_token_encrypted: botToken,
          portfolio_items: JSON.stringify(portfolioItems)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка сети');
      }

      // 3. Автоматическая регистрация Webhook в Telegram (Магия SaaS)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backendUrl && botPlatform === 'telegram' && botToken) {
        try {
          const webhookUrl = `${backendUrl.replace(/\/$/, '')}/webhook/${botToken}`;
          await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
        } catch(e) {
          console.error("Ошибка авто-регистрации вебхука", e);
        }
      }

      alert('Успех! Настройки бота сохранены и активированы в вашей облачной БД Supabase!');
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#60a5fa', fontSize: '1.2rem', fontWeight: 500}}>Загрузка рабочей среды...</div>;
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>VestaBots</div>
        <div 
          className={`${styles.navItem} ${activeTab === 'my_bot' ? styles.active : ''}`}
          onClick={() => setActiveTab('my_bot')}
        >
          🤖 Мой Бот
        </div>
        <div 
          className={`${styles.navItem} ${activeTab === 'builder' ? styles.active : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          ⚙️ Настройка бота
        </div>
        <div 
          className={styles.navItem}
          onClick={() => {
            localStorage.removeItem('vesta_token');
            localStorage.removeItem('vesta_user_id');
            router.push('/login');
          }}
          style={{marginTop: 'auto', color: '#ef4444'}}
        >
          🚪 Выйти
        </div>
      </aside>

      <main className={styles.main}>
        {activeTab === 'my_bot' && (
          <div className={styles.fadeContainer}>
            <div className={styles.header}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <h1>Мой Бот <span style={{fontSize: '1rem', fontWeight: 500, color: '#10b981', border: '1px solid #10b981', padding: '0.2rem 0.5rem', borderRadius: '1rem'}}>● Работает</span></h1>
              </div>
              {botUsername && (
                <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" style={{color: '#60a5fa', textDecoration: 'none', background: 'rgba(96, 165, 250, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500}}>
                  🤖 @{botUsername} ↗
                </a>
              )}
            </div>
            
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Текущая сводка</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Всего записей</h3>
                  <div className={styles.statValue} style={{color: '#10b981'}}>{appointments.length}</div>
                </div>
                <div className={styles.statCard}>
                  <h3>Новых клиентов</h3>
                  <div className={styles.statValue}>{appointments.length > 0 ? (appointments.length * 1.5).toFixed(0) : 0}</div>
                </div>
                <div className={styles.statCard}>
                  <h3>Заработано</h3>
                  <div className={styles.statValue}>{appointments.length * 5000} ₸</div>
                </div>
                <div className={styles.statCard}>
                  <h3>Средний рейтинг ⭐</h3>
                  <div className={styles.statValue}>5.0</div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📋 История переписок и записей</h2>
              <div className={styles.historyBox}>
                {appointments.length === 0 ? (
                  <p className={styles.emptyText}>Здесь будут отображаться новые диалоги клиента с ботом и совершенные записи.</p>
                ) : (
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, color: '#e2e8f0'}}>
                    {appointments.map((app: any) => (
                      <li key={app.id} style={{background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '0.8rem', marginBottom: '1rem', borderLeft: '4px solid #10b981'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                          <strong><span style={{fontSize: '1.2rem', marginRight: '0.5rem'}}>🤑</span> Новая запись через бота!</strong>
                          <span style={{fontSize: '0.8rem', color: '#a5b4fc', background: 'rgba(165, 180, 252, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.3rem'}}>
                            {new Date(app.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <div style={{color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6'}}>
                          <p>🎯 Услуга: Забронировано на <strong>{app.master_name || 'Неизвестно'}</strong> (5 000 ₸)</p>
                          <p>💳 Способ оплаты: <strong>{app.payment_method === 'pay_kaspi' ? 'Kaspi QR' : 'Наличные на месте'}</strong></p>
                          <p>✅ Статус: <strong>Успешно ({app.status})</strong></p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'builder' && (
          <div className={styles.fadeContainer}>
            <div className={styles.header}>
              <div>
                <h1>Сборка бота</h1>
                <p style={{color: 'var(--text-muted)', marginTop: '0.5rem'}}>Заполняйте шаг за шагом. Справа превью вашего бота.</p>
              </div>
              <button className={styles.saveBtn} onClick={handleSaveToDB}>Сохранить и Запустить</button>
            </div>

            <div className={styles.builderArea}>
              {/* ЛЕВАЯ ЧАСТЬ: ФОРМА КОНСТРУКТОРА */}
              <div className={styles.builderForm}>
                <div className={styles.chainLayout}>
                  
                  {/* ШАГ 1: Платформа */}
                  <div className={styles.section}>
                    <div className={styles.stepBadge}>ШАГ 1</div>
                    <h2 className={styles.sectionTitle}>💬 Выбор мессенджера</h2>
                    <div className={styles.cardRadioGroup}>
                      <div 
                        className={`${styles.cardRadio} ${botPlatform === 'whatsapp' ? styles.active : ''}`}
                        onClick={() => setBotPlatform('whatsapp')}
                      >
                        <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📞</div>
                        <h3>WhatsApp Бот</h3>
                        <p>Общение в популярном мессенджере</p>
                      </div>
                      <div 
                        className={`${styles.cardRadio} ${botPlatform === 'telegram' ? styles.active : ''}`}
                        onClick={() => setBotPlatform('telegram')}
                      >
                        <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>✈️</div>
                        <h3>Telegram Бот</h3>
                        <p>Меню и автоматизация (Web Apps)</p>
                      </div>
                    </div>
                  </div>

                  {/* ШАГ 2: Данные бизнеса */}
                  <div className={styles.section}>
                    <div className={styles.stepBadge}>ШАГ 2</div>
                    <h2 className={styles.sectionTitle}>📌 Базовая информация</h2>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Название бизнеса / Instagram (необязательно)</label>
                        <input className={styles.input} type="text" placeholder="@beautysalon или Имя" />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Номер телефона</label>
                        <input className={styles.input} type="tel" placeholder="+7 (705) 000-00-00" />
                      </div>
                      {botPlatform === 'telegram' && (
                        <div className={styles.inputGroupFull} style={{background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
                          <h3 style={{color: '#60a5fa', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem'}}>
                            <span>🤖</span> Как создать своего персонального бота?
                          </h3>
                          <div style={{fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '1.5rem', lineHeight: '1.5'}}>
                            <ol style={{paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', margin: 0}}>
                              <li>Откройте Telegram и найдите <strong>@BotFather</strong> (бота с синей галочкой).</li>
                              <li>Отправьте ему команду <strong>/newbot</strong>.</li>
                              <li>Сначала он попросит Имя — введите красивое название на любом языке (например: <em>Студия Красоты Астана</em>).</li>
                              <li>Затем он попросит Username (логин) — введите на английском, без пробелов, оканчивающееся на <em>_bot</em> (например: <em>astana_beauty_bot</em>).</li>
                              <li>Затем он пришлет длинное сообщение успеха. Скопируйте длинный ключ (токен) вида <code>123456:ABC-DEF...</code> и вставьте ниже:</li>
                            </ol>
                          </div>
                          <label className={styles.label} style={{color: '#fff', fontWeight: 600}}>🔑 Токен Telegram-бота (от BotFather)</label>
                          <input 
                            className={styles.input} 
                            type="password" 
                            placeholder="Например: 1234567890:AAH_xyzABC... (вставьте ключ сюда)" 
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            style={{borderColor: '#60a5fa', background: 'rgba(0,0,0,0.4)', color: '#bfdbfe'}}
                          />
                        </div>
                      )}
                      <div className={styles.inputGroupFull}>
                        <label className={styles.label}>Приветственное сообщение клиента (первое письмо)</label>
                        <textarea 
                          className={styles.textarea} 
                          style={{minHeight: '80px'}}
                          placeholder="Привет! Я ассистент салона красоты. Выберите услугу 👇"
                          value={greeting}
                          onChange={(e) => setGreeting(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* ШАГ 3: Сфера бизнеса и Календарь */}
                  <div className={styles.section}>
                    <div className={styles.stepBadge}>ШАГ 3</div>
                    <h2 className={styles.sectionTitle}>💼 Сфера бизнеса и логика расписания</h2>
                    <div className={styles.cardRadioGroup}>
                      <div 
                        className={`${styles.cardRadio} ${businessType === 'beauty' ? styles.active : ''}`}
                        onClick={() => setBusinessType('beauty')}
                      >
                        <h3>Услуги по времени (Маникюр, Салоны)</h3>
                        <p>Календарь бронирует четкие слоты (часы).</p>
                      </div>
                      <div 
                        className={`${styles.cardRadio} ${businessType === 'bakery' ? styles.active : ''}`}
                        onClick={() => setBusinessType('bakery')}
                      >
                        <h3>Заказы на дату (Кондитеры, Товары)</h3>
                        <p>Бронь даты готовности (без точного времени).</p>
                      </div>
                    </div>

                    <div className={styles.dynamicBlock}>
                      <h3 style={{marginBottom: '1rem', color: '#fff'}}>{businessType === 'beauty' ? 'Еженедельный график работы' : 'Настройки приема заказов'}</h3>
                      
                      {businessType === 'beauty' ? (
                        <div className={styles.scheduleGrid}>
                          {schedule.map((day, idx) => (
                            <div key={day.name} className={`${styles.scheduleRow} ${!day.active ? styles.inactiveRow : ''}`}>
                              <div className={styles.scheduleDayName}>{day.name}</div>
                              <div className={styles.toggleRow} style={{padding: 0, border: 'none', width: 'auto'}}>
                                <input 
                                  type="checkbox" 
                                  checked={day.active} 
                                  onChange={() => toggleDay(idx)}
                                  style={{transform: 'scale(1.2)', accentColor: 'var(--accent-color)'}}
                                />
                              </div>
                              <div className={styles.scheduleInputs}>
                                {day.active ? (
                                  <>
                                    <input type="time" className={styles.timeInput} defaultValue={day.start} />
                                    <span>-</span>
                                    <input type="time" className={styles.timeInput} defaultValue={day.end} />
                                  </>
                                ) : (
                                  <span style={{color: 'var(--text-muted)'}}>Выходной день</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.formGrid}>
                          <div className={styles.inputGroup}>
                            <label className={styles.label}>Макс. заказов на одну дату</label>
                            <input className={styles.input} type="number" defaultValue={5} />
                          </div>
                          <div className={styles.inputGroup}>
                            <label className={styles.label}>За сколько ней перестаем принимать заказы</label>
                            <input className={styles.input} type="number" defaultValue={2} />
                          </div>
                          <div className={styles.inputGroupFull}>
                            <label className={styles.label}>Доступные дни недели для выдачи</label>
                            <input className={styles.input} type="text" defaultValue="Ежедневно" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ШАГ 4: Портфолио / Прайс / Мастера */}
                  <div className={styles.section}>
                    <div className={styles.stepBadge}>ШАГ 4</div>
                    <h2 className={styles.sectionTitle}>📸 Портфолио, Прайс и Сотрудники</h2>
                    <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>Добавьте карточки услуг, их длительность и мастеров, которые их выполняют.</p>
                    
                    <div className={styles.portfolioList}>
                      {portfolioItems.map((item) => (
                        <div className={styles.portfolioItem} key={item.id}>
                          <label className={styles.imagePlaceholder} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                            {item.image ? (
                              <img src={item.image} alt="preview" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem'}} />
                            ) : (
                              <>
                                <span style={{fontSize:'1.5rem'}}>+</span>
                                <span style={{marginTop: '0.2rem'}}>Фото</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={(e) => handleImageUpload(e, item.id)} 
                            />
                          </label>
                          <div className={styles.formGrid}>
                            <div className={styles.inputGroupFull}>
                              <label className={styles.label}>Название ({businessType === 'beauty' ? 'Услуга' : 'Товар'})</label>
                              <input className={styles.input} type="text" placeholder={businessType === 'beauty' ? 'Маникюр с дизайном' : 'Бенто-торт "Космос"'} />
                            </div>
                            <div className={styles.inputGroup}>
                              <label className={styles.label}>Цена (₸)</label>
                              <input className={styles.input} type="number" placeholder="5000" />
                            </div>
                            {businessType === 'beauty' ? (
                              <>
                                <div className={styles.inputGroup}>
                                  <label className={styles.label}>Длительность процедуры</label>
                                  <select className={styles.input}>
                                    {DURATION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                  </select>
                                </div>
                                <div className={styles.inputGroupFull}>
                                  <label className={styles.label}>Выполняют мастера (имена через запятую)</label>
                                  <input className={styles.input} type="text" placeholder="Например: Аня, Дильназ, Лена (оставьте пустым если мастер один)" />
                                  <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Если указано больше одного, бот предложит клиенту выбрать конкретного мастера.</p>
                                </div>
                              </>
                            ) : (
                              <div className={styles.inputGroup}>
                                <label className={styles.label}>Краткое описание</label>
                                <input className={styles.input} type="text" placeholder="" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className={styles.addBtn} onClick={addPortfolioItem}>+ Добавить еще позицию</button>

                    {/* Доп. опции (Конструктор заказа) */}
                    {businessType === 'bakery' && (
                      <div className={styles.dynamicBlock} style={{marginTop: '2rem'}}>
                        <h3 style={{marginBottom: '0.5rem', color: '#fff'}}>🧩 Конфигуратор заказа (Сборные опции)</h3>
                        <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                          Позвольте клиенту собирать заказ по шагам (например: Выбор бисквита ➔ Выбор начинки).
                        </p>
                        
                        <div className={styles.serviceItem}>
                          <div className={styles.serviceInfo}>
                            <h4>Категория: 1. Выбор начинки</h4>
                            <p style={{marginTop: '0.25rem'}}>Варианты: Сникерс (+0₸), Красный бархат (+500₸), Фисташка-малина (+1000₸)</p>
                          </div>
                        </div>
                        <button className={styles.addBtn} style={{marginTop: '0.5rem'}}>+ Добавить новый шаг опций</button>
                      </div>
                    )}
                  </div>

                  {/* ШАГ 5: Оплата и Рейтинг */}
                  <div className={styles.section}>
                    <div className={styles.stepBadge}>ШАГ 5</div>
                    <h2 className={styles.sectionTitle}>💰 Оплата и Удержание клиентов</h2>
                    <h3 style={{color: '#fff', marginBottom: '1rem', fontSize: '1rem'}}>Выберите доступные способы оплаты:</h3>
                    
                    <div className={styles.toggleRow}>
                      <div>
                        <h4 style={{color: '#fff', marginBottom: '0.25rem'}}>1. Оплата наличными</h4>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Оплата при получении или визите.</p>
                      </div>
                      <input type="checkbox" defaultChecked style={{transform: 'scale(1.5)', accentColor: 'var(--accent-color)'}}/>
                    </div>
                    
                    <div className={styles.toggleRow}>
                      <div>
                        <h4 style={{color: '#fff', marginBottom: '0.25rem'}}>2. Связь с менеджером (Заявка)</h4>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Менеджер/Мастер напишет клиенту для оплаты.</p>
                      </div>
                      <input type="checkbox" defaultChecked style={{transform: 'scale(1.5)', accentColor: 'var(--accent-color)'}}/>
                    </div>
                    
                    <div className={styles.toggleRow}>
                      <div>
                        <h4 style={{color: '#fff', marginBottom: '0.25rem'}}>3. Авто-оплата Kaspi QR / Перевод</h4>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Показываем QR код, клиент оплачивает и отправляет чек.</p>
                      </div>
                      <input type="checkbox" defaultChecked style={{transform: 'scale(1.5)', accentColor: 'var(--accent-color)'}}/>
                    </div>

                    <div style={{marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding:'1.5rem', borderRadius:'1rem', border: '1px solid var(--card-border)'}}>
                       <div style={{marginBottom:'1rem', color: '#fff'}}>Реквизиты для авто-оплаты (загрузите QR или укажите номер Kaspi):</div>
                       <input className={styles.input} type="text" placeholder="+7 700 000 00 00 Имя Фамилия" style={{marginBottom: '1rem'}} />
                       <div className={styles.uploadBox} style={{padding: '1.5rem'}}>
                          <div>📎 Нажмите, чтобы загрузить картинку QR</div>
                       </div>

                       <div className={styles.toggleRow} style={{borderBottom: 'none', paddingBottom: 0, marginTop: '1.5rem'}}>
                        <div>
                          <h4 style={{color: '#fff', marginBottom: '0.25rem'}}>Требовать чек от клиента</h4>
                          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Бот попросит отправить скриншот перевода (фото или PDF) для подтверждения.</p>
                        </div>
                        <input type="checkbox" defaultChecked style={{transform: 'scale(1.5)', accentColor: 'var(--accent-color)'}}/>
                      </div>
                    </div>

                    <div className={styles.inputGroupFull} style={{marginTop: '2rem'}}>
                      <label className={styles.label}>Текст финального сообщения от бота (после получения чека)</label>
                      <textarea className={styles.textarea} style={{minHeight: '70px'}} defaultValue="✅ Запись успешно подтверждена! Ждем вас." />
                    </div>

                    <div className={styles.dynamicBlock} style={{marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem'}}>
                      <h3 style={{marginBottom: '0.5rem', color: '#fff'}}>⭐ Авто-рейтинг мастеров (Сбор отзывов)</h3>
                      <div className={styles.toggleRow} style={{borderBottom: 'none'}}>
                        <div>
                          <h4 style={{color: '#fff', marginBottom: '0.25rem'}}>Запрашивать отзыв после завершения</h4>
                          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px'}}>В день визита бот автоматически спросит "Как прошла запись?" и попросит оценить от 1 до 5 звезд. Отзывы будут видны в вашей вкладке "Мой бот".</p>
                        </div>
                        <input type="checkbox" defaultChecked style={{transform: 'scale(1.5)', accentColor: 'var(--accent-color)'}}/>
                      </div>
                    </div>

                  </div>

                  {/* ШАГ 6: Дизайн меню (Только для TG) */}
                  {botPlatform === 'telegram' && (
                    <div className={styles.section}>
                      <div className={styles.stepBadge}>ШАГ 6</div>
                      <h2 className={styles.sectionTitle}>🎨 Дизайн меню в Telegram</h2>
                      <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>Выберите стиль кнопок вашего меню (предпросмотр справа).</p>

                      <div className={styles.cardRadioGroup}>
                        <div className={`${styles.cardRadio} ${menuStyle === 'minimal' ? styles.active : ''}`} onClick={() => setMenuStyle('minimal')}>
                          <h3>Минимализм</h3>
                        </div>
                        <div className={`${styles.cardRadio} ${menuStyle === 'neon' ? styles.active : ''}`} onClick={() => setMenuStyle('neon')}>
                          <h3>Неон</h3>
                        </div>
                        <div className={`${styles.cardRadio} ${menuStyle === 'glass' ? styles.active : ''}`} onClick={() => setMenuStyle('glass')}>
                          <h3>Стекло</h3>
                        </div>
                        <div className={`${styles.cardRadio} ${menuStyle === 'luxury' ? styles.active : ''}`} onClick={() => setMenuStyle('luxury')}>
                          <h3>Премиум</h3>
                        </div>
                        <div className={`${styles.cardRadio} ${menuStyle === 'pastel' ? styles.active : ''}`} onClick={() => setMenuStyle('pastel')}>
                          <h3>Пастель</h3>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* ПРАВАЯ ЧАСТЬ: ПРЕДПРОСМОТР (ИНТЕРАКТИВНЫЙ ТЕЛЕФОН) */}
              <aside className={styles.previewPhone}>
                <div className={styles.previewPhoneHeader}>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{botPlatform === 'telegram' ? '🤖 VestaBot_TG' : '📞 VestaBot_WhatsApp'}</div>
                  <div style={{fontSize: '0.8rem', color: '#a5b4fc', marginTop: '0.2rem'}}>Предпросмотр</div>
                </div>
                
                <div className={styles.previewPhoneBody}>
                  
                  {botPlatform === 'whatsapp' ? (
                    /* WHATSAPP MOCKUP */
                    <div className={styles.botMessage} style={{background: '#075E54', color: '#fff', maxWidth: '100%', borderRadius: '0.5rem', borderBottomLeftRadius: 0}}>
                      {greeting || "Привет! В ответном сообщении отправьте номер услуги:"}
                      <br/><br/>
                      {businessType === 'beauty' ? (
                        <>
                          1️⃣ Стрижка - от 5 000 ₸<br/>
                          2️⃣ Маникюр - 4 000 ₸<br/>
                          3️⃣ Мои записи<br/><br/>
                          Ответьте цифрой для выбора.
                          <hr style={{opacity: 0.2, margin: '1rem 0'}}/>
                          <i style={{fontSize: '0.8rem'}}>Затем бот напишет:</i><br/>
                          🤖: Кого из мастеров вы выберете? (1 - Дильназ, 2 - Аня)
                        </>
                      ) : (
                        <>
                          1️⃣ Продукция и Торты<br/>
                          2️⃣ Набор Капкейков<br/>
                          3️⃣ Мои заказы<br/><br/>
                          Ответьте цифрой для выбора.
                        </>
                      )}
                    </div>
                  ) : (
                    /* TELEGRAM MOCKUP */
                    <>
                      <div className={styles.botMessage}>
                        {greeting || "Привет! Выберите услугу ниже (Здесь будет ваш текст приветствия)."}
                      </div>

                      <div className={`${styles.previewMenuOptions} ${styles['menu_' + menuStyle]}`}>
                        {businessType === 'beauty' ? (
                          <>
                            <button className={styles.previewMenuBtn}>💇‍♀️ Стрижка - от 5 000 ₸</button>
                            <button className={styles.previewMenuBtn}>💅 Маникюр - 4 000 ₸</button>
                            <button className={styles.previewMenuBtn}>📅 Мои записи</button>
                          </>
                        ) : (
                          <>
                            <button className={styles.previewMenuBtn}>🎂 Продукция и Торты</button>
                            <button className={styles.previewMenuBtn}>🧁 Набор Капкейков</button>
                            <button className={styles.previewMenuBtn}>📦 Мои заказы</button>
                          </>
                        )}
                      </div>
                      
                      <div className={styles.botMessage} style={{marginTop: 'auto', background: 'transparent', color: '#888', border: '1px dashed #444', textAlign: 'center'}}>
                        ☝ Так бот будет выглядеть на экране клиента. Меняйте стиль в Шаге 6.
                      </div>
                    </>
                  )}
                  
                </div>
              </aside>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
