import { z } from "zod";

export class Command<T extends z.ZodTuple = z.ZodTuple> {
  constructor(
    public readonly description: string,
    public readonly args: T,
    private readonly handler: (...args: z.infer<T>) => Promise<void>
  ) {}

  get usage(): string {
    const items = this.args._zod.def.items as z.ZodTypeAny[];
    if (items.length === 0) return "";
    return (
      " " +
      items
        .map(item => {
          const inner = (item._zod.def as { innerType?: { description?: string } }).innerType;
          const label = item.description ?? inner?.description ?? "arg";
          return item.isOptional() ? `[${label}]` : `<${label}>`;
        })
        .join(" ")
    );
  }

  async run(name: string, rawArgs: string[]): Promise<void> {
    const parsed = this.args.safeParse(rawArgs);
    if (!parsed.success) {
      console.error(`Usage: ./scripts/e2e.ts ${name}${this.usage}`);
      process.exit(1);
    }
    await this.handler(...(parsed.data as z.infer<T>));
  }
}
