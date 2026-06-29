import { redirect } from 'next/navigation';

export default function RootPage() {
  // What this code does: As soon as anyone hits http://localhost:3000/, 
  // Next.js will instantly redirect them to your premium 3D login screen.
  redirect('/login');
}