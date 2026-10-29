import { useState, useEffect, type FormEvent } from 'react';
import './App.css';

// ============================================================================
// НАСТРОЙКИ БЭКЕНДА
// ============================================================================
const API_BASE_URL = 'https://inai-col2.fishrungames.com';

const ENDPOINTS = {
  register: `${API_BASE_URL}/api/register/`,
  login: `${API_BASE_URL}/api/login/`,
  logout: `${API_BASE_URL}/api/logout/`,
  profile: `${API_BASE_URL}/api/profile/`,
};

interface UserProfile {
  id?: number | string;
  username: string;
  email?: string;
  profile?: {
    first_name?: string;
    specialization?: string;
    specialization_display?: string;
    bio?: string;
    fee?: string | number;
  };
}

type AuthTab = 'login' | 'register';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Загрузка...');

  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');

  const startLoading = (text: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingText(text);
    setIsLoading(true);
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // 1. ПОЛУЧЕНИЕ ПРОФИЛЯ (GET) с передачей credentials для кук бэкенда
  const fetchProfile = async () => {
    startLoading('Загружаем профиль музыканта...');
    try {
      const response = await fetch(ENDPOINTS.profile, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Важно для Django сессий
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки профиля (${response.status})`);
      }

      const data: UserProfile = await response.json();
      setProfile(data);
      setEditUsername(data.username || '');
      setEditEmail(data.email || '');
      setEditFirstName(data.profile?.first_name || '');
      setEditBio(data.profile?.bio || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить профиль';
      setErrorMsg(message);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. РЕГИСТРАЦИЯ (POST)
  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startLoading('Регистрация нового музыканта...');

    try {
      const response = await fetch(ENDPOINTS.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.username?.[0] || 'Ошибка регистрации');
      }

      setSuccessMsg('Регистрация успешна! Теперь войдите в систему.');
      setActiveTab('login');
      setPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при регистрации';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ВХОД В СИСТЕМУ (POST) с credentials: 'include'
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startLoading('Вход в систему...');

    try {
      const response = await fetch(ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Принимаем куки сессии от бэкенда
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.non_field_errors?.[0] || 'Неверный логин или пароль');
      }

      localStorage.setItem('auth_token', 'active_session');
      setToken('active_session');
      
      setProfile(data);
      setEditUsername(data.username || '');
      setEditEmail(data.email || '');
      setEditFirstName(data.profile?.first_name || '');
      setEditBio(data.profile?.bio || '');

      setPassword('');
      setSuccessMsg('Успешный вход в систему!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. ОБНОВЛЕНИЕ ПРОФИЛЯ (PATCH)
  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    startLoading('Сохранение профиля...');

    try {
      const response = await fetch(ENDPOINTS.profile, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          profile: {
            first_name: editFirstName,
            bio: editBio,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка обновления профиля');
      }

      setProfile(data);
      setIsEditing(false);
      setSuccessMsg('Профиль успешно обновлён!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить профиль';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. ВЫХОД (POST)
  const handleLogout = async () => {
    startLoading('Выход из аккаунта...');
    try {
      await fetch(ENDPOINTS.logout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }).catch(() => {});
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setProfile(null);
      setIsEditing(false);
      setIsLoading(false);
      setSuccessMsg('Вы вышли из системы.');
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner"></div>
            <div className="loading-text">{loadingText}</div>
          </div>
        </div>
      )}

      <header className="navbar">
        <div className="logo">🎸 MIDNIGHT ECHO</div>
        <div className="nav-actions">
          {token ? (
            <>
              <span className="user-badge">
                👤 {profile?.username || username || 'Музыкант'}
              </span>
              <button className="btn btn-danger" onClick={handleLogout} disabled={isLoading}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn ${activeTab === 'login' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
              >
                Вход
              </button>
              <button
                className={`btn ${activeTab === 'register' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>MIDNIGHT ECHO</h1>
          <p>
            Официальный сайт синт-рок группы. Мировой тур, альбомы и закрытый кабинет
            для зарегистрированных участников.
          </p>
        </section>

        <div className="grid">
          <div className="card">
            <h2>🔥 Ближайшие концерты (Tour 2026)</h2>
            <div className="tour-item">
              <span className="tour-date">15 НОЯ</span>
              <span className="tour-city">Бишкек — Bishkek Arena</span>
              <span className="btn btn-outline">Sold Out</span>
            </div>
            <div className="tour-item">
              <span className="tour-date">22 НОЯ</span>
              <span className="tour-city">Алматы — Дворец Республики</span>
              <span className="btn btn-outline">Билеты</span>
            </div>
            <div className="tour-item">
              <span className="tour-date">05 ДЕК</span>
              <span className="tour-city">Берлин — Columbiahalle</span>
              <span className="btn btn-outline">Билеты</span>
            </div>
            <div className="tour-item">
              <span className="tour-date">18 ДЕК</span>
              <span className="tour-city">Токио — Zepp DiverCity</span>
              <span className="btn btn-outline">VIP</span>
            </div>

            <h2 style={{ marginTop: '28px' }}>💿 Новый альбом «Neon Horizon»</h2>
            <p style={{ color: '#b0b0cc', fontSize: '0.95rem' }}>
              1. Cybernetic Heart (03:42) <br />
              2. Shadows of Osh & Bishkek Nights (04:15) <br />
              3. Overdrive Protocol (03:58) <br />
              4. Echoes in the Rain (05:10)
            </p>
          </div>

          <div className="card">
            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            {!token ? (
              activeTab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <h2>🔐 Вход в систему</h2>
                  <div className="form-group">
                    <label>Логин (Username)</label>
                    <input
                      type="text"
                      placeholder="Введите логин"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Пароль</label>
                    <input
                      type="password"
                      placeholder="Введите пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Войти в аккаунт
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <h2>✨ Регистрация музыканта</h2>
                  <div className="form-group">
                    <label>Логин (Username)</label>
                    <input
                      type="text"
                      placeholder="Придумайте логин"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Пароль</label>
                    <input
                      type="password"
                      placeholder="Введите пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Зарегистрироваться
                  </button>
                </form>
              )
            ) : (
              <div>
                <h2>👤 Профиль музыканта</h2>

                {!isEditing ? (
                  <div className="profile-info">
                    <p>
                      <strong>Логин:</strong> {profile?.username || 'Не указан'}
                    </p>
                    <p>
                      <strong>Email:</strong> {profile?.email || 'Не указан'}
                    </p>
                    <p>
                      <strong>Имя:</strong> {profile?.profile?.first_name || 'Не указано'}
                    </p>
                    <p>
                      <strong>Специализация:</strong> {profile?.profile?.specialization_display || 'Другое'}
                    </p>
                    <p>
                      <strong>О себе:</strong> {profile?.profile?.bio || 'Нет описания.'}
                    </p>

                    <div className="profile-actions">
                      <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        ✏️ Редактировать профиль
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => fetchProfile()}
                      >
                        🔄 Обновить
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label>Логин (Username)</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Имя</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>О себе / Статус</label>
                      <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                      />
                    </div>

                    <div className="profile-actions">
                      <button type="submit" className="btn btn-primary">
                        💾 Сохранить
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;