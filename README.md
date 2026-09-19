# ⛩ Anime Calendar

Aplicação web para acompanhar os lançamentos semanais de animes e visualizar a grade da temporada atual — com suporte a favoritos, status de assistindo e muito mais.

🔗 **[Acesse o projeto ao vivo](https://RodrigoRuan2.github.io/anime-calendar-V3/)**

---

## 📌 Funcionalidades

- 📅 **Calendário semanal** — visualize os animes organizados por dia da semana com horário de lançamento
- 🎌 **Grade da temporada** — listagem completa dos animes em exibição na temporada atual
- ⭐ **Favoritos privados** — salve favoritos na sua conta
- 👁 **Progresso por episódio** — marque exatamente os episódios assistidos
- 👤 **Conta AniCal** — crie seu usuário e senha para acessar a biblioteca privada
- 🔁 **Retry automático** — tratamento de rate limit com retry inteligente na API do Jikan
- 🔒 **Chave de API protegida** — integração segura via Supabase Edge Functions

---

## 🛠 Tecnologias

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Axios](https://axios-http.com/)
- [AnimeSchedule.net API v3](https://animeschedule.net/) — cronograma semanal
- [Jikan API v4](https://jikan.moe/) — dados da temporada atual
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — proxy seguro para esconder a API key
- [GitHub Pages](https://pages.github.com/) — deploy estático
- [Capacitor](https://capacitorjs.com/) — aplicativo Android nativo a partir do mesmo código React

---

## 🔒 Segurança

A chave da API do AnimeSchedule **nunca é exposta no frontend**. O fluxo de requisição funciona assim:

```
React (GitHub Pages) → Supabase Edge Function → AnimeSchedule API
```

A chave fica armazenada nos **Supabase Secrets** e só é acessada pelo servidor da Edge Function.

---

## 📁 Estrutura do projeto

```
anime-calendar-V3/
├── public/
├── src/
│   ├── components/       # Componentes React (Calendar, SeasonGrid, Sidebar...)
│   ├── hooks/            # Custom hooks (useAnimeSchedule, useSeasonAnime, useAnimeStatus)
│   ├── services/         # Camada de API (animeScheduleApi.js)
│   ├── styles/           # Arquivos CSS separados por componente
│   ├── utils/            # Funções utilitárias (animeKey.js)
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── functions/
│       └── anime-schedule-proxy/  # Edge Function (proxy seguro)
│           └── index.ts
├── .gitignore
├── package.json
└── vite.config.js
```

---

## 🚀 Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com/) com uma Edge Function configurada
- Chave de API do [AnimeSchedule.net](https://animeschedule.net/)

### Passos

```bash
# Clone o repositório
git clone https://github.com/RodrigoRuan2/anime-calendar-V3.git
cd anime-calendar-V3

# Instale as dependências
npm install

# Crie o arquivo .env na raiz
echo "VITE_SUPABASE_FUNCTION_URL=https://SEU_PROJETO.supabase.co/functions/v1/anime-schedule-proxy" > .env
# Adicione também a URL e a Publishable key do projeto Supabase.
# Use .env.example como referência; nunca publique uma service_role key.

# Rode o projeto
npm run dev
```

### Deploy

```bash
npm run build
npm run deploy
```

### Aplicativo Android

A pasta `android/` contém o projeto nativo do AniCal, criado com Capacitor.

1. Instale o [Android Studio](https://developer.android.com/studio) e o JDK 21.
2. No Android Studio, instale o Android SDK solicitado pelo projeto.
3. Na raiz deste repositório, sincronize a versão web com o app:

```bash
npm run android:sync
```

4. Abra `android/` no Android Studio e execute no emulador ou celular Android.

Para criar um APK de teste pelo terminal:

```bash
cd android
./gradlew assembleDebug
```

O arquivo será gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## ⚙️ Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com/)
2. Instale o CLI: veja as [instruções oficiais](https://github.com/supabase/cli#install-the-cli)
3. Faça login e linke o projeto:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

4. Adicione a chave como secret:

```bash
supabase secrets set ANIMESCHEDULE_API_KEY=sua_chave_aqui
```

5. Faça o deploy da Edge Function:

```bash
supabase functions deploy anime-schedule-proxy
```

6. No dashboard do Supabase, desative a **JWT verification** na função para torná-la pública.

### Contas e biblioteca privada

O projeto inclui a migration `supabase/migrations/20260919120000_add_private_library.sql`.
Antes de ativar esta funcionalidade em produção:

1. No SQL Editor do Supabase, execute a migration (ela cria as tabelas privadas, índices, triggers e políticas RLS).
2. Em **Authentication → Providers**, mantenha o provedor **Email** ativo e a opção **Confirm email** desativada. O AniCal usa cadastro próprio com nome de usuário e senha; o identificador técnico exigido pelo Supabase é criado internamente e não pede nem exibe e-mail ao usuário.
3. Em **Authentication → URL Configuration**, cadastre:
   - `https://RodrigoRuan2.github.io/anime-calendar-V3/`
   - `http://localhost:5173/`
4. Em **Project Settings → API**, copie a Project URL e a **Publishable key** para o `.env`:

```env
VITE_SUPABASE_URL=https://rlppmkygztpdcytoeprl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

As tabelas usam Row Level Security: cada usuário autenticado acessa apenas sua própria biblioteca e seus próprios episódios.

---

## 👨‍💻 Autor

Feito por **Rodrigo Ruan** — estudante de Análise e Desenvolvimento de Sistemas, desenvolvedor front-end em formação.

- GitHub: [@RodrigoRuan2](https://github.com/RodrigoRuan2)
- Email: ruancamisaazul@gmail.com
