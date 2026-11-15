/**
 * Icon set. Now backed by `lucide-react` (installed). Each app-specific name is
 * aliased to a lucide icon so existing call sites (IconDashboard, IconCart, …)
 * keep working unchanged. Default size is normalized to 20px via a thin wrapper.
 */
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ReceiptText,
  ArrowLeftRight,
  Users,
  Settings,
  Search,
  Plus,
  Minus,
  Trash2,
  Pencil,
  X,
  Check,
  LogOut,
  Eye,
  EyeOff,
  TriangleAlert,
  TrendingUp,
  CircleDollarSign,
  Menu,
  ChevronDown,
  ArrowDownUp,
  type LucideProps,
} from "lucide-react";

type IconProps = LucideProps & { size?: number };
const withSize = (size?: number) => ({ size: size ?? 20 });

export const IconDashboard = (p: IconProps) => <LayoutDashboard {...withSize(p.size)} {...p} />;
export const IconBox = (p: IconProps) => <Package {...withSize(p.size)} {...p} />;
export const IconCart = (p: IconProps) => <ShoppingCart {...withSize(p.size)} {...p} />;
export const IconReceipt = (p: IconProps) => <ReceiptText {...withSize(p.size)} {...p} />;
export const IconMovements = (p: IconProps) => <ArrowLeftRight {...withSize(p.size)} {...p} />;
export const IconUsers = (p: IconProps) => <Users {...withSize(p.size)} {...p} />;
export const IconSettings = (p: IconProps) => <Settings {...withSize(p.size)} {...p} />;
export const IconSearch = (p: IconProps) => <Search {...withSize(p.size)} {...p} />;
export const IconPlus = (p: IconProps) => <Plus {...withSize(p.size)} {...p} />;
export const IconMinus = (p: IconProps) => <Minus {...withSize(p.size)} {...p} />;
export const IconTrash = (p: IconProps) => <Trash2 {...withSize(p.size)} {...p} />;
export const IconEdit = (p: IconProps) => <Pencil {...withSize(p.size)} {...p} />;
export const IconClose = (p: IconProps) => <X {...withSize(p.size)} {...p} />;
export const IconCheck = (p: IconProps) => <Check {...withSize(p.size)} {...p} />;
export const IconLogout = (p: IconProps) => <LogOut {...withSize(p.size)} {...p} />;
export const IconEye = (p: IconProps) => <Eye {...withSize(p.size)} {...p} />;
export const IconEyeOff = (p: IconProps) => <EyeOff {...withSize(p.size)} {...p} />;
export const IconAlert = (p: IconProps) => <TriangleAlert {...withSize(p.size)} {...p} />;
export const IconTrend = (p: IconProps) => <TrendingUp {...withSize(p.size)} {...p} />;
export const IconMoney = (p: IconProps) => <CircleDollarSign {...withSize(p.size)} {...p} />;
export const IconMenu = (p: IconProps) => <Menu {...withSize(p.size)} {...p} />;
export const IconChevronDown = (p: IconProps) => <ChevronDown {...withSize(p.size)} {...p} />;
export const IconSort = (p: IconProps) => <ArrowDownUp {...withSize(p.size)} {...p} />;
