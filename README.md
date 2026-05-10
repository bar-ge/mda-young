# MDA Young - On-Call Duty Management System

A modern, bilingual (Hebrew/English) duty management application for MDA (Magen David Adom) Young volunteers. Manage shifts, on-call duty schedules, vehicles, and driver assignments with a responsive, RTL-first interface.

**Status**: Production-Ready | **Grade**: B- | **Last Updated**: May 2026

---

## 📋 Features

- **Shift Management** — View, filter, and sign up for shifts
- **Duty Scheduling** — Manage on-call vehicle assignments and driver rosters
- **Vehicle Management** — Track vehicle availability and maintenance
- **Calendar View** — Visual calendar with color-coded shift status
- **Bilingual Support** — Full Hebrew (RTL) and English support
- **Real-time Sync** — Supabase integration for live data updates
- **Mobile-Responsive** — Works on desktop, tablet, and mobile
- **Authentication** — Secure user login via Supabase Auth
- **Error Handling** — Graceful error boundaries and error messages

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account with a project initialized

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bar-ge/mda-young.git
   cd mda-young
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Build for production
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

### Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── CalendarGrid.jsx
│   ├── MonthCalendar.jsx
│   └── Layout.jsx
├── contexts/          # React Context (Auth, Toast, Calendar)
│   ├── AuthContext.jsx
│   ├── CalendarContext.jsx
│   └── ToastContext.jsx
├── pages/             # Route-level components
│   ├── Duty.jsx
│   ├── Login.jsx
│   ├── MyShifts.jsx
│   ├── Profile.jsx
│   └── Shifts.jsx
├── lib/               # Utilities
│   └── supabase.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

---

## 🗄️ Database Setup

The app requires the following Supabase tables:
- `profiles` — User profile information
- `shifts` — Available shifts with dates, times, requirements
- `user_shifts` — User signups for shifts
- `vehicles` — Fleet vehicles
- `vehicle_assignments` — Driver-to-vehicle assignments

See `database-setup.sql` for full schema.

---

## 🔐 Security

- ✅ Environment variables for sensitive data (Supabase keys)
- ✅ Row-level security (RLS) policies on Supabase tables
- ✅ Error boundaries for graceful error handling
- ✅ Input validation on all forms
- ✅ Secure session management via Supabase Auth

---

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🚨 Known Issues & TODOs

- [ ] Add unit tests (0% coverage currently)
- [ ] Refactor MonthCalendar component (749 lines → split into sub-components)
- [ ] Add TypeScript or JSDoc for type safety
- [ ] Implement CI/CD pipeline (GitHub Actions)
- [ ] Add bundle size monitoring

---

## 📦 Dependencies

### Production
- `react@^19.2.5` — UI library
- `react-dom@^19.2.5` — React rendering
- `react-router-dom@^7.14.2` — Routing
- `@supabase/supabase-js@^2.105.3` — Backend
- `tailwindcss@^4.2.4` — Styling

### Development
- `vite@^8.0.10` — Build tool
- `eslint@^10.2.1` — Linting
- `@vitejs/plugin-react@^6.0.1` — React support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

**Code Style**: Follow ESLint rules (`npm run lint`)

---

## 📄 License

Private project — All rights reserved

---

## 📞 Support

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/bar-ge/mda-young/issues)
- Email: bar.gershenzon@gmail.com

---

## 📈 Performance

- **Build Size**: ~180KB gzipped
- **First Load**: < 2 seconds (production)
- **Lighthouse Score**: 85+

---

**Last Updated**: May 2026  
**Maintainer**: bar-ge
