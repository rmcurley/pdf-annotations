import { redirect } from 'next/navigation'

export default function Home() {
  // Let middleware handle authentication
  // This will redirect to /login if not authenticated
  // or to /projects if authenticated (via middleware)
  redirect('/projects')
}
