import {
  BarChart3,
  Bot,
  BrainCircuit,
  Boxes,
  Building2,
  Database,
  Film,
  FolderOpen,
  Globe,
  Headphones,
  History,
  Lock,
  Megaphone,
  MessageCircle,
  Package,
  Receipt,
  ShieldAlert,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Truck,
  UserCheck,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminTab =
  | 'overview' | 'merchants' | 'account_identities' | 'vault_requests' | 'products' | 'customers'
  | 'orders' | 'inventory' | 'showrooms' | 'pos' | 'finance' | 'notifications' | 'settings'
  | 'audit_logs' | 'ai_support' | 'ai_center' | 'growth' | 'support_requests' | 'merchant_support' | 'merchant_support_settings'
  | 'gallery' | 'fashion_community' | 'website_collector' | 'promotions' | 'bi_dashboard' | 'risk_monitor'
  | 'database_center';

export type AdminArea = 'operations' | 'platform';

export type AdminNavItem = {
  key: AdminTab;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  area: AdminArea;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_AREAS: Array<{ key: AdminArea; label: string; description: string }> = [
  { key: 'operations', label: '运营主页', description: '业务、仓储、增长、客服与内容' },
  { key: 'platform', label: '平台设置', description: '系统配置、数据与安全' }
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    area: 'operations',
    label: '运营管理',
    items: [
      { key: 'overview', label: '运营概览', icon: TrendingUp },
      { key: 'merchants', label: '商家管理', icon: Building2 },
      { key: 'account_identities', label: '统一账号', icon: Users },
      { key: 'customers', label: '客户审核', icon: UserCheck },
      { key: 'orders', label: '订单管理', icon: Truck },
      { key: 'products', label: '商品管理', icon: Package },
      { key: 'vault_requests', label: '专属授权', icon: Lock }
    ]
  },
  {
    area: 'operations',
    label: '仓储财务',
    items: [
      { key: 'inventory', label: '库存管理', icon: Boxes },
      { key: 'showrooms', label: '展厅预约', icon: Store },
      { key: 'pos', label: '展厅收银', icon: BarChart3 },
      { key: 'finance', label: '财务管理', icon: Receipt }
    ]
  },
  {
    area: 'operations',
    label: '增长支持',
    items: [
      { key: 'growth', label: '智能获客', icon: TrendingUp },
      { key: 'promotions', label: '促销活动', icon: Megaphone },
      { key: 'bi_dashboard', label: 'BI 报表', icon: BarChart3 },
      { key: 'risk_monitor', label: '风控监测', icon: ShieldAlert }
    ]
  },
  {
    area: 'operations',
    label: '客服与内容',
    items: [
      { key: 'support_requests', label: '用户客服', icon: MessageCircle },
      { key: 'merchant_support', label: '商家客服', icon: Headphones },
      { key: 'gallery', label: '图片图库', icon: FolderOpen },
      { key: 'fashion_community', label: '时尚社区', icon: Film },
      { key: 'website_collector', label: '图片采集', icon: Globe }
    ]
  },
  {
    area: 'platform',
    label: '系统设置',
    items: [
      { key: 'settings', label: '服务集成', icon: SlidersHorizontal },
      { key: 'notifications', label: '消息通知', icon: MessageCircle },
      { key: 'ai_support', label: '智能客服配置', icon: Bot },
      { key: 'ai_center', label: '智能员工配置', icon: BrainCircuit },
      { key: 'merchant_support_settings', label: '商家客服配置', icon: Headphones }
    ]
  },
  {
    area: 'platform',
    label: '平台运维',
    items: [
      { key: 'database_center', label: '数据库与恢复', icon: Database },
      { key: 'audit_logs', label: '操作记录', icon: History }
    ]
  }
];

export function getAdminAreaForTab(tab: AdminTab): AdminArea {
  return ADMIN_NAV_GROUPS.find(group => group.items.some(item => item.key === tab))?.area ?? 'operations';
}
