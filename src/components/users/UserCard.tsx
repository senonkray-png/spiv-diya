import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { roleLabelUk } from "@/lib/role-labels";

interface UserCardProps {
  user: {
    id: string;
    companyName: string;
    industry: string | null;
    businessNiche?: string | null;
    city: string | null;
    avatarUrl: string | null;
    verified: boolean;
    interests?: string[];
    role?: string;
    aboutMe?: string | null;
  };
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Link
      href={`/u/${user.id}`}
      className="group block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar src={user.avatarUrl} name={user.companyName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900 dark:text-white truncate group-hover:text-blue-600">
              {user.companyName}
            </p>
            {user.verified && <Badge variant="green" size="xs">✓</Badge>}
            {user.role && user.role !== "member" && (
              <Badge variant="blue" size="xs">{roleLabelUk(user.role)}</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {user.businessNiche || user.industry}
            {user.city ? ` · ${user.city}` : ""}
          </p>
          {user.aboutMe && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
              {user.aboutMe}
            </p>
          )}
          {user.interests && user.interests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {user.interests.slice(0, 4).map((i) => (
                <Badge key={i} variant="neutral" size="xs">
                  {i}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
