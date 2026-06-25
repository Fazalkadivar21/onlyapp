import { mockActivityItems } from "@mark-1/shared";
import { activityItems } from "./schema";
import { createDb } from "./index";

const db = createDb();

await db.delete(activityItems);

await db.insert(activityItems).values(
  mockActivityItems.map((item) => ({
    source: item.source,
    sourceId: item.sourceId,
    type: item.type,
    title: item.title,
    body: item.body,
    actorName: item.actorName,
    actorAvatar: item.actorAvatar,
    url: item.url,
    priority: item.priority,
    status: item.status,
    metadata: item.metadata,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }))
);

console.log(`Seeded ${mockActivityItems.length} activity items.`);
