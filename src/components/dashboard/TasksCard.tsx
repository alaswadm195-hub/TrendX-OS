export default function TasksCard() {
  const tasks = [
    {
      id: 1,
      title: "تصميم بوست افتتاح",
      client: "السلطان السوري",
      employee: "محمد",
    },
    {
      id: 2,
      title: "مونتاج فيديو إعلاني",
      client: "Smart Academy",
      employee: "أحمد",
    },
    {
      id: 3,
      title: "إدارة حملة إعلانية",
      client: "شركة الأمانة",
      employee: "علي",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            التاسكات
          </h2>

          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
            {tasks.length} مهام
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border rounded-xl p-4 hover:bg-slate-50 transition"
          >
            <h3 className="font-medium">
              {task.title}
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              العميل: {task.client}
            </p>

            <p className="text-sm text-slate-500">
              الموظف: {task.employee}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}