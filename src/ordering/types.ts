import type { ApiComponents } from "@probiz/sdk";

type Schemas = ApiComponents["schemas"];

export type OrderingPage = Schemas["PublicOrderingPage"];
export type OrderingMenu = Schemas["PublicOrderingMenu"];
export type OrderingSection = Schemas["PublicOrderingSection"];
export type OrderingItem = Schemas["PublicOrderingItem"];
export type OrderPlaced = Schemas["PublicOrderingOrderPlaced"];
export type PlacedOrder = Schemas["PublicOrderingOrder"];
export type WaiterCall = Schemas["PublicOrderingCall"];
export type OrderStatus = PlacedOrder["status"];
