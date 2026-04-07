# ⛩ Anime Calendar

Calendário semanal de animes com horário de exibição e plataformas de streaming, construído com **React + Vite** e a [AnimeSchedule.net API](https://animeschedule.net/api/v3/documentation).

---

## 🚀 Como rodar

### 1. Instale as dependências
```bash
npm install
```

### 2. Configure a API key
Copie o arquivo de exemplo e preencha sua chave:
```bash
cp .env.example .env
```

Edite o `.env`:
```
VITE_ANIMESCHEDULE_API_KEY=sua_api_key_aqui
```

> Obtenha sua API key gratuita em: `https://animeschedule.net/users/SEU_USUARIO/settings/api`

### 3. Rode o projeto
```bash
npm run dev
```

---

## 📁 Estrutura do projeto

```
src/
├── components/
│   ├── Calendar.jsx      # Grid semanal com os 7 dias
│   ├── DayColumn.jsx     # Coluna de um dia com lista de animes
│   └── AnimeCard.jsx     # Card individual de cada anime
├── hooks/
│   └── useAnimeSchedule.js   # Hook customizado para buscar dados
├── services/
│   └── animeScheduleApi.js   # Configuração e chamadas à API
├── App.jsx
└── App.css               # Estilos globais (tema dark anime)
```

---

## ✅ Funcionalidades atuais
- [x] Calendário semanal (segunda → domingo)
- [x] Horário de exibição no fuso do usuário
- [x] Episódio atual
- [x] Links para plataformas (Crunchyroll, Netflix, etc.)
- [x] Destaque no dia de hoje
- [x] Loading e tratamento de erro
- [x] Responsivo (mobile, tablet, desktop)

## 💡 Melhorias futuras
- [ ] Filtro por plataforma (só Crunchyroll, só Netflix...)
- [ ] Busca de anime por nome
- [ ] Favoritar animes (localStorage)
- [ ] Notificações de novo episódio
- [ ] Modo claro / escuro
