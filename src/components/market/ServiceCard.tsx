import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

interface ServiceCardProps {
  service: {
    id: string;
    type: "offer" | "request";
    title: string;
    description: string;
    priceTokens: number | null;
    priceUAH: number | null;
    photos: string[];
    city: string | null;
    category: string | null;
    status: string;
    owner: {
      id: string;
      companyName: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  };
  href?: string;
}

export function ServiceCard({ service, href }: ServiceCardProps) {
  const link = href ?? `/marketplace/services/${service.id}`;
  const isRequest = service.type === "request";

  return (
    <Link
      href={link}
      className="group block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <Badge variant={isRequest ? "amber" : "blue"}>
          {isRequest ? "Шукаю" : "Пропоную"}
        </Badge>
        {service.priceUAH != null ? (
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            {service.priceUAH.toLocaleString("uk-UA")} ₴
          </span>
        ) : service.priceTokens && service.priceTokens > 0 ? (
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            {service.priceTokens} монет
          </span>
        ) : (
          <span className="text-xs font-medium text-zinc-500">Договірна</span>
        )}
      </div>
      <h3 className="font-semibold text-zinc-900 dark:text-white text-base group-hover:text-blue-600 transition-colors line-clamp-2">
        {service.title}
      </h3>
      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{service.description}</p>
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Avatar src={service.owner.avatarUrl} name={service.owner.companyName} size="xs" />
        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1">
          {service.owner.companyName}
        </span>
        {service.city && <span className="text-[10px] text-zinc-400 shrink-0">{service.city}</span>}
      </div>
    </Link>
  );
}
