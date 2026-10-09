import { createClient } from './utils/supabase/server';

export default async function Page() {
  // Fallback cookie store for server rendering
  const cookieStore = {
    getAll: () => [],
    set: () => {}
  };
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from('todos').select();

  return (
    <ul className="p-4 space-y-2">
      {todos?.map((todo: any) => (
        <li key={todo.id} className="text-sm font-medium text-slate-200">
          {todo.name}
        </li>
      ))}
    </ul>
  );
}
