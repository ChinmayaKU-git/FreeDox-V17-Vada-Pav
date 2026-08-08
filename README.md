# BookSpace - Facility & Resource Booking System

A full-stack, premium facility booking application built for an 8-hour hackathon.

## Features
- **Role-Based Access**: Specialized interfaces for Students, Faculty, and Admins.
- **Dynamic Calendar**: `react-big-calendar` integrated for real-time visualization of bookings.
- **Resource Adjustments**: Users can negotiate slot swaps and relinquishments directly with each other.
- **Atomic Transactions**: Complete protection against booking overlaps and race conditions using SQLite WAL mode.
- **Admin Dashboard**: Approvals and analytical charts for facility utilization and cancellation rates.

## Tech Stack
- Next.js 14 (App Router)
- React Query (Data fetching & polling for real-time updates)
- Tailwind CSS v3 & shadcn/ui
- `better-sqlite3` (Database)

## Getting Started

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
5. You can login as any seeded user (Alice/Bob for Students, Carol for Faculty, Admin user) to explore the flows!
