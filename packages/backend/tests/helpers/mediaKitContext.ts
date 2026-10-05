export function mediaKitContext(subject: string | null = "owner") {
  const rows = new Map<string, any>();
  let serial = 0;
  const ctx: any = {
    rows,
    auth: { getUserIdentity: async () => (subject ? { subject } : null) },
    storage: {
      getUrl: async (id: string) => `https://storage.test/${id}`,
      delete: async () => {},
    },
    scheduler: { runAfter: async () => `scheduled-${++serial}` },
    runMutation: async () => "",
    db: {
      get: async (id: string) => rows.get(id) ?? null,
      insert: async (table: string, data: any) => {
        const id = `${table}-${++serial}`;
        rows.set(id, { ...data, _id: id, _creationTime: Date.now(), table });
        return id;
      },
      patch: async (id: string, data: any) => {
        const row = rows.get(id);
        for (const [k, v] of Object.entries(data)) {
          if (v === undefined) delete row[k];
          else row[k] = v;
        }
      },
      delete: async (id: string) => rows.delete(id),
      replace: async (id: string, data: any) => {
        const row = rows.get(id);
        rows.set(id, { ...data, _id: id, _creationTime: row._creationTime, table: row.table });
      },
      query: (table: string) => {
        let list = () => [...rows.values()].filter((r) => r.table === table);
        const q: any = {
          withIndex: (_: string, build?: any) => {
            if (build) {
              const conditions: any[] = [];
              const chain: any = {
                eq: (k: string, v: any) => {
                  conditions.push([k, v]);
                  return chain;
                },
              };
              build(chain);
              const prev = list;
              list = () =>
                prev().filter((r) => conditions.every(([k, v]) => r[k] === v));
            }
            return q;
          },
          unique: async () => {
            const a = list();
            if (a.length > 1) throw Error("not unique");
            return a[0] ?? null;
          },
          take: async (n: number) => list().slice(0, n),
          order: (direction: string) => {
            const previous = list;
            list = () =>
              direction === "desc" ? previous().reverse() : previous();
            return q;
          },
          paginate: async () => ({
            page: list(),
            isDone: true,
            continueCursor: "",
          }),
        };
        return q;
      },
    },
  };
  rows.set("creator-1", {
    _id: "creator-1",
    table: "creators",
    user_id: "owner",
    username: "owner-kit",
    name: "Owner",
  });
  return ctx;
}
export const call = (fn: any, ctx: any, args: any = {}) =>
  fn._handler(ctx, args);
