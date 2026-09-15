import "./tailadmin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 font-outfit text-gray-900 dark:bg-gray-950 dark:text-gray-100">{children}</div>;
}
