import { getIntlLocale } from '../../i18n/translations';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { 
  Building2, 
  Package, 
  Boxes, 
  Layers,
  Truck, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Plus, 
  Lock, 
  Unlock, 
  Eye, 
  ShieldCheck, 
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Monitor,
  LogOut,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  X,
  Globe,
  Loader2,
  Info,
  Pencil,
  Sparkles,
  Download,
  Printer,
  FileText,
  Share2,
  Bell,
  Volume2,
  Bot
} from 'lucide-react';
import { PasswordInput } from '../common/PasswordInput';
import { useB2B } from '../../context/B2BContext';
import { isLanguage, LANGUAGE_OPTIONS } from '../../i18n/translations';
import { ProductImage } from '../common/ProductImage';
import { SmartMediaUploader } from './SmartMediaUploader';
import { MerchantAiHome } from './MerchantAiHome';
import { MerchantStoreView } from '../frontend/MerchantStoreView';
import { apiGet, apiPost, apiPut, apiRequest } from '../../api/client';
import { DEFAULT_MERCHANT_LOGO, merchantMediaUrl } from '../../utils/merchantMedia';
import { parseCsvRecords } from '../../utils/csv';
import { getProductZone, getProductZoneUpdates, type ProductZone } from '../../utils/productZone';
import type { CustomerLevel, Order, Product, WholesaleCustomer } from '../../types/b2b';

const MerchantSmartPos = lazy(() =>
  import('./MerchantSmartPos').then(module => ({ default: module.MerchantSmartPos }))
);

interface MerchantMobileAppProps {
  onSwitchToDesktop?: () => void;
}

interface MerchantInventoryBalance {
  id: string;
  sku: string;
  product: { id: string; styleNo: string; name: string };
  location: { code: string; name: string };
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inTransitQuantity: number;
  updatedAt: string;
}

interface MerchantShipment {
  id: string;
  shipmentNo: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  status: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}

interface MobileMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  reorderPoint: number;
  leadTimeDays: number;
  status: string;
  unitLocked: boolean;
  notes?: string | null;
  onHandQuantity: number;
  availableQuantity: number;
}

interface MobileWorkOrder {
  id: string;
  workOrderNo: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  status: string;
  priority: string;
  dueDate?: string | null;
  product: { styleNo: string; name: string };
  variant: { sku: string; color?: string | null; size?: string | null };
  outputLocation: { code: string; name: string };
}

interface MobileBankAccount {
  id: string;
  accountHolder: string;
  iban: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string | null;
}

interface MobileMerchantProfile {
  name: string;
  companyLegalName: string;
  vatNumber: string;
  country: string;
  city: string;
  showroomAddress: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
}

interface MobileEmployee {
  id: string;
  name: string;
  email: string;
  role: 'sales' | 'warehouse' | 'production' | 'pos_cashier' | 'store_manager';
  permissions?: string;
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface MobileEmployeeAudit {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
}

interface MobileOperationsIntelligence {
  summary: {
    gmv30d: number;
    orders30d: number;
    pendingFulfillment: number;
    pendingReturns: number;
    lowStockSkus: number;
    slowMoverSkus?: number;
    gmvTrend?: number;
  };
  replenishment: Array<{ styleNo: string; sku: string; availableQuantity: number; sold30d: number; daysCover: number | null; suggestedQuantity: number }>;
  alerts: Array<{ severity: 'critical' | 'warning' | 'info'; type: string; message: string }>;
}

interface MobileFinanceSummary {
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalRefunds: number;
  commissionRate: string;
  paymentFeeRate: string;
}

export const MerchantMobileApp: React.FC<MerchantMobileAppProps> = ({ onSwitchToDesktop }) => {
  const { 
    merchants,
    selectedMerchantId,
    logout,
    products,
    addProduct,
    updateProduct,
    orders,
    merchantFulfillOrder,
    syncOrderFromServer,
    approveReturn,
    rejectReturn,
    vaultRequests,
    approveVaultAccess,
    rejectVaultAccess,
    allCustomers,
    addNotification,
    replaceOrderFromServer,
    replaceMerchantProductsFromServer,
    localizeCopy,
    lang,
    languagePreference,
    setLang,
    setAutoLanguage
  } = useB2B();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'inventory' | 'orders' | 'customers' | 'store' | 'profile' | 'ai_home' | 'pos'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'published' | 'draft' | 'private' | 'low_stock'>('all');
  const [productCategory, setProductCategory] = useState('all');
  const [productSort, setProductSort] = useState<'updated' | 'stock' | 'price'>('updated');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productEditUnlocked, setProductEditUnlocked] = useState(false);
  const [productDraft, setProductDraft] = useState<Partial<Product> | null>(null);
  const [productDraftBusy, setProductDraftBusy] = useState(false);
  const [productSmartBusy, setProductSmartBusy] = useState(false);
  const [productSmartAdvice, setProductSmartAdvice] = useState<string[]>([]);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormBusy, setProductFormBusy] = useState(false);
  const [productForm, setProductForm] = useState({
    styleNo: '',
    name: '',
    category: 'Abbigliamento 服装',
    subCategory: '',
    brand: '',
    season: '2026/27 FW',
    wholesalePrice: '',
    rrpPrice: '',
    costPrice: '',
    moq: '6',
    packSize: '6',
    fabric: '',
    origin: 'Made in Italy',
    description: '',
    status: 'new' as Product['status'],
    inventoryStatus: 'in_stock' as Product['inventoryStatus'],
    visibility: 'public' as Product['visibility'],
    lifecycleStatus: 'draft' as Product['lifecycleStatus'],
    defaultColor: 'Nero 黑',
    defaultSize: 'M',
    defaultStock: '30'
  });
  const [productBusyId, setProductBusyId] = useState<string | null>(null);
  const [selectedOrderToFulfill, setSelectedOrderToFulfill] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [orderEditUnlocked, setOrderEditUnlocked] = useState(false);
  const [orderEditDraft, setOrderEditDraft] = useState<Order | null>(null);
  const [orderEditBusy, setOrderEditBusy] = useState(false);
  const [orderDocumentBusy, setOrderDocumentBusy] = useState(false);
  const [orderAlertCount, setOrderAlertCount] = useState(0);
  const [orderQuery, setOrderQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'action' | 'shipping' | 'completed' | 'returns'>('all');
  const [carrier, setCarrier] = useState('DHL Express');
  const [trackingNo, setTrackingNo] = useState('');
  const [fulfillmentBusy, setFulfillmentBusy] = useState(false);
  const [shipments, setShipments] = useState<MerchantShipment[]>([]);
  const [shipmentQuantities, setShipmentQuantities] = useState<Record<string, number>>({});
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [inventoryBalances, setInventoryBalances] = useState<MerchantInventoryBalance[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | CustomerLevel>('all');
  const [customerSort, setCustomerSort] = useState<'latest' | 'value' | 'orders' | 'risk'>('value');
  const [selectedCustomer, setSelectedCustomer] = useState<WholesaleCustomer | null>(null);
  const [mobileCustomers, setMobileCustomers] = useState<WholesaleCustomer[]>([]);
  const [showCustomerActions, setShowCustomerActions] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerFormBusy, setCustomerFormBusy] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    companyName: '', contactPerson: '', email: '', vatNumber: '', address: '',
    city: '', country: 'Italy', phone: '', businessType: 'Boutique', customerLevel: 'new_customer' as CustomerLevel, notes: ''
  });
  const [mobileSettings, setMobileSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ruda-merchant-mobile-settings') || '{"alerts":true,"compact":false,"sound":true}') as { alerts: boolean; compact: boolean; sound: boolean };
    } catch {
      return { alerts: true, compact: false, sound: true };
    }
  });
  const [merchantSettings, setMerchantSettings] = useState({
    name: '', companyLegalName: '', vatNumber: '', country: '', city: '', showroomAddress: '',
    contactPerson: '', contactPhone: '', contactEmail: '', moq: 1, defaultPaymentTerm: 'prepaid',
    shippingNote: '', notifyOrders: true, notifyPayouts: true, notifyVault: true, notifyMarketing: false,
    mobileDefaultTab: 'dashboard', mobileLanguage: 'auto'
  });
  const [merchantSettingsBusy, setMerchantSettingsBusy] = useState(false);
  const [lastSettingsSync, setLastSettingsSync] = useState<Date | null>(null);
  const [settingsSection, setSettingsSection] = useState<'operations' | 'store' | 'finance' | 'team' | null>(null);
  const [merchantProfileUnlocked, setMerchantProfileUnlocked] = useState(false);
  const [merchantProfileLoaded, setMerchantProfileLoaded] = useState(false);
  const [smartCardBusy, setSmartCardBusy] = useState(false);
  const [teamEmployees, setTeamEmployees] = useState<MobileEmployee[]>([]);
  const [teamAudit, setTeamAudit] = useState<MobileEmployeeAudit[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);
  const [teamBusyId, setTeamBusyId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', password: '', role: 'sales' as MobileEmployee['role'] });
  const [employeeCreateBusy, setEmployeeCreateBusy] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({ accountHolder: '', iban: '' });
  const [bankAccountBusy, setBankAccountBusy] = useState(false);
  useEffect(() => {
    void apiGet<{ success: true; settings: Partial<typeof merchantSettings> & { mobileAlerts?: boolean; mobileCompact?: boolean }; merchant: MobileMerchantProfile | null }>('/api/merchant/settings')
      .then(result => {
        const next = { alerts: result.settings.mobileAlerts ?? true, compact: result.settings.mobileCompact ?? false, sound: mobileSettings.sound ?? true };
        setMobileSettings(next);
        localStorage.setItem('ruda-merchant-mobile-settings', JSON.stringify(next));
        setMerchantSettings(previous => ({
          ...previous,
          ...result.settings,
          name: result.merchant?.name ?? currentMerchant?.name ?? previous.name,
          companyLegalName: result.merchant?.companyLegalName ?? currentMerchant?.companyLegalName ?? previous.companyLegalName,
          vatNumber: result.merchant?.vatNumber ?? currentMerchant?.vatNumber ?? previous.vatNumber,
          country: result.merchant?.country ?? currentMerchant?.country ?? previous.country,
          city: result.merchant?.city ?? currentMerchant?.city ?? previous.city,
          showroomAddress: result.merchant?.showroomAddress ?? currentMerchant?.showroomAddress ?? previous.showroomAddress,
          contactPerson: result.merchant?.contactPerson ?? currentMerchant?.contactPerson ?? previous.contactPerson,
          contactPhone: result.merchant?.contactPhone ?? currentMerchant?.contactPhone ?? previous.contactPhone,
          contactEmail: result.merchant?.contactEmail ?? currentMerchant?.contactEmail ?? previous.contactEmail
        }));
        setLastSettingsSync(new Date());
        setMerchantProfileLoaded(true);
        if (result.settings.mobileDefaultTab) setActiveTab(result.settings.mobileDefaultTab as typeof activeTab);
      })
      .catch(error => addNotification('warning', '设置加载失败', error instanceof Error ? error.message : '请检查网络后重试'));
  }, [selectedMerchantId, addNotification]);
  const [factoryMaterials, setFactoryMaterials] = useState<MobileMaterial[]>([]);
  const [showMaterialManager, setShowMaterialManager] = useState(false);
  const [materialBusy, setMaterialBusy] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialUnitLocked, setEditingMaterialUnitLocked] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    code: '', name: '', category: 'fabric', unit: 'meter', unitCost: '0',
    reorderPoint: '0', leadTimeDays: '0', status: 'active', notes: ''
  });
  const [materialInbound, setMaterialInbound] = useState({ materialId: '', quantity: '', note: '' });
  const [factoryWorkOrders, setFactoryWorkOrders] = useState<MobileWorkOrder[]>([]);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factoryBusyId, setFactoryBusyId] = useState<string | null>(null);
  const [reportingWorkOrder, setReportingWorkOrder] = useState<MobileWorkOrder | null>(null);
  const [reportForm, setReportForm] = useState({ goodQuantity: '', rejectedQuantity: '0', note: '' });
  const [reportBusy, setReportBusy] = useState(false);
  const [mobileBankAccounts, setMobileBankAccounts] = useState<MobileBankAccount[]>([]);
  const [operationsIntelligence, setOperationsIntelligence] = useState<MobileOperationsIntelligence | null>(null);
  const [financeSummary, setFinanceSummary] = useState<MobileFinanceSummary | null>(null);

  const currentMerchantId = selectedMerchantId || 'mch-prato';
  const currentMerchant = merchants.find(m => m.id === currentMerchantId) || merchants[0];
  const mobileItalian = lang === 'it';
  const mobileText = (zh: string, it: string) => localizeCopy(zh, it);
  const merchantProfileValue = (key: keyof MobileMerchantProfile) => merchantProfileLoaded
    ? merchantSettings[key]
    : merchantSettings[key] || currentMerchant?.[key] || '';

  // 严格商户数据隔离
  const merchantProducts = products.filter(p => p.merchantId === currentMerchantId);
  const merchantProductIds = new Set(merchantProducts.map(p => p.id));
  const merchantOrders = orders.flatMap(order => {
    if (order.merchantId === currentMerchantId) return [order];
    if (order.subOrders?.length) {
      return order.subOrders.filter(subOrder => subOrder.merchantId === currentMerchantId);
    }

    const merchantItems = order.items.filter(item => merchantProductIds.has(item.productId));
    if (merchantItems.length === 0) return [];

    return [{
      ...order,
      items: merchantItems,
      totalQty: merchantItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: Number(merchantItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)),
      merchantId: currentMerchantId,
      merchantName: currentMerchant?.name || 'RUDA Merchant'
    }];
  });
  const merchantVaultRequests = vaultRequests.filter(vr => vr.merchantId === currentMerchantId);
  const merchantCustomerIds = new Set([
    ...merchantOrders.map(order => order.customerId),
    ...merchantVaultRequests.map(request => request.customerId)
  ]);
  const merchantCustomers = [...allCustomers.filter(customer => merchantCustomerIds.has(customer.id)), ...mobileCustomers]
    .filter((customer, index, customers) => customers.findIndex(item => item.id === customer.id) === index);
  const customerMetrics = merchantCustomers.map(customer => {
    const customerOrders = merchantOrders.filter(order => order.customerId === customer.id);
    const orderValue = customerOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const lastOrder = customerOrders
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))[0];
    const creditUsed = Number(customer.usedCredit || 0);
    const creditLimit = Number(customer.creditLimit || 0);
    return {
      customer,
      orders: customerOrders,
      orderValue,
      lastOrder,
      creditUsed,
      creditLimit,
      creditRatio: creditLimit > 0 ? creditUsed / creditLimit : 0,
      vaultRequest: merchantVaultRequests.find(request => request.customerId === customer.id)
    };
  });
  const filteredMerchantCustomers = customerMetrics.filter(({ customer, creditRatio }) => {
    const query = customerQuery.trim().toLowerCase();
    const matchesQuery = !query || `${customer.companyName} ${customer.contactPerson} ${customer.email} ${customer.phone} ${customer.city} ${customer.vatNumber}`.toLowerCase().includes(query);
    const matchesFilter = customerFilter === 'all'
      || (customer.customerLevel || 'new_customer') === customerFilter;
    return matchesQuery && matchesFilter;
  }).sort((left, right) => {
    if (customerSort === 'orders') return right.orders.length - left.orders.length;
    if (customerSort === 'risk') return right.creditRatio - left.creditRatio;
    if (customerSort === 'latest') return String(right.lastOrder?.date || '').localeCompare(String(left.lastOrder?.date || ''));
    return right.orderValue - left.orderValue;
  });
  const goodCustomerCount = merchantCustomers.filter(customer => customer.customerLevel === 'good_customer').length;
  const overdueCustomerCount = merchantCustomers.filter(customer => customer.customerLevel === 'overdue_customer').length;
  const customerRevenue = customerMetrics.reduce((sum, metric) => sum + metric.orderValue, 0);
  const customerLevelLabel: Record<CustomerLevel, string> = {
    good_customer: '好客户',
    regular_customer: '熟客户',
    new_customer: '新客户',
    standard_customer: '普通客户',
    overdue_customer: '欠钱客户'
  };

  const createMobileCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (customerFormBusy) return;
    setCustomerFormBusy(true);
    try {
      const result = await apiPost<{ success: true; customer: WholesaleCustomer }>('/api/merchant/customers', customerForm);
      setMobileCustomers(previous => [result.customer, ...previous.filter(customer => customer.id !== result.customer.id)]);
      setCustomerForm({ companyName: '', contactPerson: '', email: '', vatNumber: '', address: '', city: '', country: 'Italy', phone: '', businessType: 'Boutique', customerLevel: 'new_customer', notes: '' });
      setShowCustomerForm(false);
      addNotification('success', '客户已加入档案', `${result.customer.companyName} 已建立商家客户关系，等待平台认证`);
    } catch (error) {
      addNotification('warning', '客户添加失败', error instanceof Error ? error.message : '请检查客户资料');
    } finally {
      setCustomerFormBusy(false);
    }
  };

  const importMobileCustomers = async (file: File) => {
    try {
      const records = parseCsvRecords(await file.text()).filter(record => record.some(value => value.trim() !== ''));
      if (records.length < 2) throw new Error('CSV_FILE_EMPTY');
      const headers = records[0].map(value => value.trim().toLowerCase());
      const aliases: Record<string, string> = { company: 'companyName', companyname: 'companyName', contact: 'contactPerson', contactperson: 'contactPerson', email: 'email', vat: 'vatNumber', vatnumber: 'vatNumber', address: 'address', city: 'city', country: 'country', phone: 'phone', businesstype: 'businessType', type: 'businessType' };
      const imported: WholesaleCustomer[] = [];
      let failed = 0;
      for (const values of records.slice(1, 201)) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => { const field = aliases[header]; if (field) row[field] = (values[index] || '').trim(); });
        try {
          if (!row.companyName || !row.email) throw new Error('CSV_CUSTOMER_REQUIRED_FIELDS');
          const result = await apiPost<{ success: true; customer: WholesaleCustomer }>('/api/merchant/customers', {
            companyName: row.companyName, contactPerson: row.contactPerson, email: row.email, vatNumber: row.vatNumber,
            address: row.address, city: row.city, country: row.country || 'Italy', phone: row.phone,
            businessType: row.businessType || 'Boutique', notes: 'Imported from CSV'
          });
          imported.push(result.customer);
        } catch { failed += 1; }
      }
      setMobileCustomers(previous => [...imported, ...previous.filter(customer => !imported.some(item => item.id === customer.id))]);
      addNotification(imported.length ? 'success' : 'warning', '客户导入完成', `成功 ${imported.length} 条，失败 ${failed} 条；失败记录请修正后重新导入`);
    } catch (error) {
      addNotification('warning', '客户导入失败', error instanceof Error && error.message === 'CSV_FILE_EMPTY'
        ? 'CSV 文件没有可导入记录'
        : error instanceof Error && error.message === 'CSV_UNCLOSED_QUOTE'
          ? 'CSV 引号未闭合，请修正文件后重新导入'
          : '请使用包含表头且格式正确的 CSV 文件');
    }
  };

  const openCustomerEditor = (customer: WholesaleCustomer) => {
    setCustomerForm({
      companyName: customer.companyName, contactPerson: customer.contactPerson, email: customer.email,
      vatNumber: customer.vatNumber, address: customer.address, city: customer.city, country: customer.country,
      phone: customer.phone, businessType: customer.businessType, customerLevel: customer.customerLevel || 'new_customer', notes: ''
    });
    setEditingCustomerId(customer.id);
    setSelectedCustomer(null);
    setShowCustomerForm(true);
  };

  const saveMobileCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCustomerId || customerFormBusy) return;
    setCustomerFormBusy(true);
    try {
      const result = await apiPut<{ success: true; customer: WholesaleCustomer }>(`/api/merchant/customers/${encodeURIComponent(editingCustomerId)}`, customerForm);
      setMobileCustomers(previous => [result.customer, ...previous.filter(customer => customer.id !== result.customer.id)]);
      setShowCustomerForm(false);
      setEditingCustomerId(null);
      addNotification('success', '客户资料已更新', `${result.customer.companyName} 的资料已同步到商家端和 App`);
    } catch (error) {
      addNotification('warning', '客户资料更新失败', error instanceof Error ? error.message : '请检查资料后重试');
    } finally {
      setCustomerFormBusy(false);
    }
  };

  const updateMobileSetting = async (key: 'alerts' | 'compact' | 'sound', value: boolean) => {
    const next = { ...mobileSettings, [key]: value };
    setMobileSettings(next);
    localStorage.setItem('ruda-merchant-mobile-settings', JSON.stringify(next));
    if (key === 'sound') return;
    try {
      await apiPut('/api/merchant/settings', { ...merchantSettings, mobileAlerts: next.alerts, mobileCompact: next.compact });
      addNotification('success', '手机设置已保存', key === 'alerts' ? (value ? '已开启运营提醒' : '已关闭运营提醒') : (value ? '已开启紧凑显示' : '已关闭紧凑显示'));
    } catch (error) {
      setMobileSettings(previous => ({ ...previous, [key]: !value }));
      localStorage.setItem('ruda-merchant-mobile-settings', JSON.stringify({ ...mobileSettings, [key]: !value }));
      addNotification('warning', '手机设置保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const saveMerchantSettings = async () => {
    if (merchantSettingsBusy) return;
    if (!merchantSettings.name.trim() || !merchantSettings.companyLegalName.trim() || !merchantSettings.contactEmail.includes('@')) {
      addNotification('warning', '资料校验失败', '请填写店铺名称、法定主体和有效邮箱');
      return;
    }
    setMerchantSettingsBusy(true);
    try {
      const result = await apiPut<{ success: true; settings: typeof merchantSettings; merchant: MobileMerchantProfile }>('/api/merchant/settings', {
        ...merchantSettings,
        mobileAlerts: mobileSettings.alerts,
        mobileCompact: mobileSettings.compact
      });
      setMerchantSettings(previous => ({ ...previous, ...result.settings, ...result.merchant }));
      setMerchantProfileLoaded(true);
      addNotification('success', '商家设置已保存', '手机端和 Web 端已同步');
    } catch (error) {
      addNotification('warning', '商家设置保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setMerchantSettingsBusy(false);
    }
  };
  const smartCardText = () => [
    `BEGIN:VCARD`, `VERSION:3.0`,
    `FN:${merchantProfileValue('name') || 'RUDA Merchant'}`,
    `ORG:${merchantProfileValue('companyLegalName')}`,
    `TEL:${merchantProfileValue('contactPhone')}`,
    `EMAIL:${merchantProfileValue('contactEmail')}`,
    `ADR:;;${merchantProfileValue('showroomAddress')};${merchantProfileValue('city')};;${merchantProfileValue('country')}`,
    `URL:${window.location.origin}`, `END:VCARD`
  ].join('\r\n');
  const downloadSmartCard = (extension: 'vcf' | 'html') => {
    const title = merchantProfileValue('name') || 'RUDA Merchant';
    const content = extension === 'vcf' ? smartCardText() : `<!doctype html><html><meta charset="utf-8"><title>${title}</title><body style="font:16px Arial;max-width:560px;margin:40px auto;padding:24px;border:1px solid #ddd;border-radius:20px"><h1>${title}</h1><p>${merchantProfileValue('companyLegalName')}</p><p>${merchantProfileValue('contactPhone')}<br>${merchantProfileValue('contactEmail')}</p><p>${merchantProfileValue('showroomAddress')}<br>${merchantProfileValue('city')}, ${merchantProfileValue('country')}</p></body></html>`;
    const blob = new Blob([content], { type: extension === 'vcf' ? 'text/vcard;charset=utf-8' : 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9-_]+/gi, '-') || 'merchant-card'}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const shareSmartCard = async () => {
    setSmartCardBusy(true);
    try {
      const title = merchantProfileValue('name') || 'RUDA Merchant';
      const text = `${title} · ${merchantProfileValue('contactPhone')}`;
      if (navigator.share) await navigator.share({ title, text, url: window.location.origin });
      else { await navigator.clipboard.writeText(window.location.origin); addNotification('success', '名片链接已复制', '可以发送给朋友或客户'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) addNotification('warning', '分享名片失败', error instanceof Error ? error.message : '请稍后重试');
    } finally { setSmartCardBusy(false); }
  };
  const orderActionCount = merchantOrders.filter(order => ['placed', 'pending', 'confirmed', 'picking'].includes(order.status)).length;
  const orderReturnCount = merchantOrders.filter(order => order.refundStatus === 'requested').length;
  const orderRevenue = merchantOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const previousOrderActionCount = React.useRef(orderActionCount);
  useEffect(() => {
    if (previousOrderActionCount.current === orderActionCount) return;
    if (orderActionCount > previousOrderActionCount.current && mobileSettings.alerts) {
      setOrderAlertCount(orderActionCount - previousOrderActionCount.current);
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (mobileSettings.sound && AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.06, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.22);
        }
      } catch {
        // Audio is optional and may be blocked until the user interacts with the page.
      }
      addNotification('success', '订单有新进展', `当前有 ${orderActionCount} 笔订单需要处理`);
    }
    previousOrderActionCount.current = orderActionCount;
  }, [addNotification, mobileSettings.alerts, mobileSettings.sound, orderActionCount]);
  const lowMaterialCount = factoryMaterials.filter(material => material.availableQuantity <= material.reorderPoint).length;
  const activeWorkOrders = factoryWorkOrders.filter(workOrder => !['completed', 'cancelled'].includes(workOrder.status));

  const openOrderDocument = (order: Order, document: 'invoice' | 'picking' | 'packing') => {
    window.open(`/api/merchant/orders/${encodeURIComponent(order.id)}/print?document=${document}`, '_blank', 'noopener,noreferrer');
  };
  const shareOrderDocument = async (order: Order, scope: 'order' | 'invoice' = 'invoice') => {
    setOrderDocumentBusy(true);
    try {
      const result = await apiPost<{ success: true; shareUrl: string }>('/api/merchant/orders/' + encodeURIComponent(order.id) + '/share', { scope });
      if (navigator.share) {
        await navigator.share({ title: `${order.orderNo} · RUDA`, url: result.shareUrl });
      } else {
        await navigator.clipboard.writeText(result.shareUrl);
        addNotification('success', '单据链接已复制', '可发送给客户或保存到其他应用');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) addNotification('warning', '分享单据失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOrderDocumentBusy(false);
    }
  };
  const sendOrderDocument = async (order: Order) => {
    const recipient = window.prompt('请输入客户邮箱', '');
    if (recipient === null) return;
    setOrderDocumentBusy(true);
    try {
      await apiPost(`/api/merchant/orders/${encodeURIComponent(order.id)}/documents/send`, { recipient });
      addNotification('success', '单据已发送', `已发送至 ${recipient}`);
    } catch (error) {
      addNotification('warning', '单据发送失败', error instanceof Error ? error.message : '请检查邮箱后重试');
    } finally {
      setOrderDocumentBusy(false);
    }
  };
  const startOrderEdit = (order: Order) => {
    setOrderEditUnlocked(true);
    setOrderEditDraft(JSON.parse(JSON.stringify(order)) as Order);
  };
  const saveOrderEdit = async () => {
    if (!orderEditDraft || orderEditBusy) return;
    setOrderEditBusy(true);
    try {
      const result = await apiPut<{ success: true; order: Order }>(`/api/merchant/orders/${encodeURIComponent(orderEditDraft.id)}/edit`, {
        companyName: orderEditDraft.companyName,
        deliveryType: orderEditDraft.deliveryType,
        pickupLocation: orderEditDraft.pickupLocation,
        paymentMethod: orderEditDraft.paymentMethod,
        shippingAddress: orderEditDraft.shippingAddress,
        notes: orderEditDraft.notes,
        items: orderEditDraft.items.map(item => ({ id: item.id, quantity: item.quantity, unitPrice: item.unitPrice }))
      });
      setSelectedOrderDetail(result.order);
      replaceOrderFromServer(result.order);
      setOrderEditDraft(null);
      setOrderEditUnlocked(false);
      addNotification('success', '订单已更正', `${result.order.orderNo} 的资料和金额已同步`);
    } catch (error) {
      addNotification('warning', '订单保存失败', error instanceof Error ? error.message : '请检查订单资料后重试');
    } finally {
      setOrderEditBusy(false);
    }
  };

  const refreshFactoryData = async () => {
    if (factoryLoading) return;
    setFactoryLoading(true);
    try {
      const [materialsResult, workOrdersResult, bankResult, intelligenceResult, financeResult] = await Promise.all([
        apiGet<{ success: true; materials: MobileMaterial[] }>('/api/merchant/materials'),
        apiGet<{ success: true; workOrders: MobileWorkOrder[] }>('/api/merchant/production/work-orders'),
        apiGet<{ success: true; accounts: MobileBankAccount[] }>('/api/merchant/bank-accounts'),
        apiGet<MobileOperationsIntelligence & { success: true }>('/api/merchant/operations/intelligence'),
        apiGet<{ success: true; summary: MobileFinanceSummary }>('/api/merchant/finance')
      ]);
      setFactoryMaterials(materialsResult.materials);
      setFactoryWorkOrders(workOrdersResult.workOrders);
      setMobileBankAccounts(bankResult.accounts);
      setOperationsIntelligence(intelligenceResult);
      setFinanceSummary(financeResult.summary);
    } catch (error) {
      addNotification('warning', '工厂数据加载失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setFactoryLoading(false);
    }
  };

  const refreshFactoryMaterials = async () => {
    const result = await apiGet<{ success: true; materials: MobileMaterial[] }>('/api/merchant/materials');
    setFactoryMaterials(result.materials);
    if (!result.materials.some(material => material.id === materialInbound.materialId && material.status === 'active')) {
      setMaterialInbound(previous => ({ ...previous, materialId: result.materials.find(material => material.status === 'active')?.id || '' }));
    }
  };

  const openMaterialEditor = (material?: MobileMaterial) => {
    if (!material) {
      setEditingMaterialId(null);
      setEditingMaterialUnitLocked(false);
      setMaterialForm({ code: '', name: '', category: 'fabric', unit: 'meter', unitCost: '0', reorderPoint: '0', leadTimeDays: '0', status: 'active', notes: '' });
      return;
    }
    setEditingMaterialId(material.id);
    setEditingMaterialUnitLocked(material.unitLocked);
    setMaterialForm({
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      unitCost: String(material.unitCost),
      reorderPoint: String(material.reorderPoint),
      leadTimeDays: String(material.leadTimeDays),
      status: material.status,
      notes: material.notes || ''
    });
    setShowMaterialManager(true);
  };

  const saveFactoryMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (materialBusy) return;
    const unitCost = Number(materialForm.unitCost);
    const reorderPoint = Number(materialForm.reorderPoint);
    const leadTimeDays = Number(materialForm.leadTimeDays);
    if (!Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(reorderPoint) || reorderPoint < 0 || !Number.isInteger(leadTimeDays) || leadTimeDays < 0) {
      addNotification('warning', '物料资料不正确', '成本、安全库存需为非负数，交期需为非负整数');
      return;
    }
    setMaterialBusy(true);
    try {
      const payload = { ...materialForm, code: materialForm.code.trim().toUpperCase(), name: materialForm.name.trim(), unitCost, reorderPoint, leadTimeDays };
      if (editingMaterialId) {
        await apiPut(`/api/merchant/materials/${encodeURIComponent(editingMaterialId)}`, payload);
      } else {
        await apiPost('/api/merchant/materials', payload);
      }
      await refreshFactoryMaterials();
      setMaterialForm({ code: '', name: '', category: 'fabric', unit: 'meter', unitCost: '0', reorderPoint: '0', leadTimeDays: '0', status: 'active', notes: '' });
      setEditingMaterialId(null);
      setEditingMaterialUnitLocked(false);
      addNotification('success', editingMaterialId ? '物料资料已更新' : '物料已创建', `${payload.code} · ${payload.name}`);
    } catch (error) {
      addNotification('warning', editingMaterialId ? '物料更新失败' : '物料创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setMaterialBusy(false);
    }
  };

  const receiveFactoryMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(materialInbound.quantity);
    if (!materialInbound.materialId || !Number.isFinite(quantity) || quantity <= 0) {
      addNotification('warning', '入库资料不完整', '请选择启用的面辅料并填写大于 0 的收货数量');
      return;
    }
    setMaterialBusy(true);
    try {
      await apiPost(`/api/merchant/materials/${encodeURIComponent(materialInbound.materialId)}/inbound`, {
        quantity,
        locationCode: 'central',
        note: materialInbound.note,
        idempotencyKey: crypto.randomUUID()
      });
      await refreshFactoryMaterials();
      setMaterialInbound(previous => ({ ...previous, quantity: '', note: '' }));
      addNotification('success', '面辅料已入库', '库存已更新，可用于 BOM 备料和生产预留');
    } catch (error) {
      addNotification('warning', '面辅料入库失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setMaterialBusy(false);
    }
  };

  const refreshTeamSettings = async () => {
    if (teamLoading) return;
    setTeamLoading(true);
    setTeamLoadError(null);
    try {
      const result = await apiGet<{ success: true; employees: MobileEmployee[] }>('/api/merchant/employees');
      setTeamEmployees(result.employees);
      try {
        const auditResult = await apiGet<{ success: true; logs: MobileEmployeeAudit[] }>('/api/merchant/employee-audit');
        setTeamAudit(auditResult.logs);
      } catch (error) {
        setTeamAudit([]);
        addNotification('warning', '审计记录加载失败', error instanceof Error ? error.message : '请稍后重试');
      }
    } catch (error) {
      setTeamLoadError(error instanceof Error ? error.message : '当前账户没有员工管理权限');
      setTeamEmployees([]);
    } finally {
      setTeamLoading(false);
    }
  };

  const createTeamEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (employeeCreateBusy) return;
    setEmployeeCreateBusy(true);
    try {
      await apiPost('/api/merchant/employees', employeeForm);
      setEmployeeForm({ name: '', email: '', password: '', role: 'sales' });
      addNotification('success', '员工账号已创建', '员工可以使用邮箱和初始密码登录');
      await refreshTeamSettings();
    } catch (error) {
      addNotification('warning', '员工创建失败', error instanceof Error ? error.message : '请检查资料后重试');
    } finally {
      setEmployeeCreateBusy(false);
    }
  };

  const setTeamEmployeeActive = async (employee: MobileEmployee) => {
    setTeamBusyId(employee.id);
    try {
      await apiRequest(`/api/merchant/employees/${encodeURIComponent(employee.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !employee.active })
      });
      setTeamEmployees(previous => previous.map(item => item.id === employee.id ? { ...item, active: !employee.active } : item));
      addNotification('success', employee.active ? '员工账号已停用' : '员工账号已启用', employee.name);
      void refreshTeamSettings();
    } catch (error) {
      addNotification('warning', '员工状态更新失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setTeamBusyId(null);
    }
  };

  const submitBankAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (bankAccountBusy) return;
    setBankAccountBusy(true);
    try {
      await apiPost('/api/merchant/bank-accounts', bankAccountForm);
      setBankAccountForm({ accountHolder: '', iban: '' });
      const result = await apiGet<{ success: true; accounts: MobileBankAccount[] }>('/api/merchant/bank-accounts');
      setMobileBankAccounts(result.accounts);
      addNotification('success', '收款账户已提交', '平台财务核验通过后即可用于结算');
    } catch (error) {
      addNotification('warning', '账户提交失败', error instanceof Error ? error.message : '请检查账户资料后重试');
    } finally {
      setBankAccountBusy(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile' && settingsSection === 'team') void refreshTeamSettings();
  }, [activeTab, settingsSection, currentMerchantId]);

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'profile') void refreshFactoryData();
  }, [activeTab, currentMerchantId]);

  const advanceWorkOrder = async (workOrder: MobileWorkOrder) => {
    const nextStatus: Record<string, string> = { draft: 'released', released: 'in_progress', in_progress: 'qc_hold', qc_hold: 'in_progress' };
    const status = nextStatus[workOrder.status];
    if (!status || factoryBusyId) return;
    setFactoryBusyId(workOrder.id);
    try {
      const result = await apiPut<{ success: true; workOrder: MobileWorkOrder }>(`/api/merchant/production/work-orders/${encodeURIComponent(workOrder.id)}/status`, { status });
      setFactoryWorkOrders(previous => previous.map(item => item.id === workOrder.id ? result.workOrder : item));
      addNotification('success', '生产状态已更新', `${workOrder.workOrderNo} → ${status}`);
    } catch (error) {
      addNotification('warning', '生产状态更新失败', error instanceof Error ? error.message : '请在电脑端检查工单');
    } finally {
      setFactoryBusyId(null);
    }
  };

  const submitProductionReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportingWorkOrder || reportBusy) return;
    const goodQuantity = Number(reportForm.goodQuantity);
    const rejectedQuantity = Number(reportForm.rejectedQuantity || 0);
    if (!Number.isInteger(goodQuantity) || goodQuantity < 0 || !Number.isInteger(rejectedQuantity) || rejectedQuantity < 0 || goodQuantity + rejectedQuantity <= 0) {
      addNotification('warning', '报产数量无效', '请输入合格数量和不合格数量，合计必须大于 0');
      return;
    }
    setReportBusy(true);
    try {
      await apiPost(`/api/merchant/production/work-orders/${encodeURIComponent(reportingWorkOrder.id)}/reports`, {
        goodQuantity,
        rejectedQuantity,
        note: reportForm.note,
        idempotencyKey: crypto.randomUUID()
      });
      setFactoryWorkOrders(previous => previous.map(order => order.id === reportingWorkOrder.id
        ? { ...order, completedQuantity: order.completedQuantity + goodQuantity, rejectedQuantity: order.rejectedQuantity + rejectedQuantity }
        : order));
      addNotification('success', '生产报产已入账', `${reportingWorkOrder.workOrderNo} 已将 ${goodQuantity} 件合格品计入成品库存`);
      setReportingWorkOrder(null);
      setReportForm({ goodQuantity: '', rejectedQuantity: '0', note: '' });
    } catch (error) {
      addNotification('warning', '生产报产失败', error instanceof Error ? error.message : '工单数据可能已变化，请刷新后重试');
    } finally {
      setReportBusy(false);
    }
  };
  const filteredMerchantOrders = merchantOrders.filter(order => {
    const query = orderQuery.trim().toLowerCase();
    const matchesQuery = !query || `${order.orderNo} ${order.companyName} ${order.customerCompanyName || ''}`.toLowerCase().includes(query);
    const matchesFilter = orderFilter === 'all'
      || (orderFilter === 'action' && ['placed', 'pending', 'confirmed', 'picking'].includes(order.status))
      || (orderFilter === 'shipping' && order.status === 'shipped')
      || (orderFilter === 'completed' && ['delivered', 'returned', 'cancelled'].includes(order.status))
      || (orderFilter === 'returns' && order.refundStatus === 'requested');
    return matchesQuery && matchesFilter;
  });
  const productCategories = Array.from(new Set(merchantProducts.map(product => product.category).filter(Boolean))).sort();
  const visibleProducts = merchantProducts.filter(product => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || `${product.styleNo} ${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
    const matchesCategory = productCategory === 'all' || product.category === productCategory;
    const matchesFilter = productFilter === 'all'
      || (productFilter === 'published' && (product.lifecycleStatus || 'published') === 'published')
      || (productFilter === 'draft' && ['draft', 'pending_review', 'rejected', 'archived'].includes(product.lifecycleStatus || ''))
      || (productFilter === 'private' && product.visibility === 'private')
      || (productFilter === 'low_stock' && product.inventoryStatus === 'low_stock');
    return matchesQuery && matchesCategory && matchesFilter;
  }).sort((left, right) => {
    if (productSort === 'price') return right.wholesalePrice - left.wholesalePrice;
    if (productSort === 'stock') {
      const stock = (product: Product) => product.skus.reduce((sum, sku) => sum + sku.stockCentral, 0);
      return stock(left) - stock(right);
    }
    return String(right.styleNo).localeCompare(String(left.styleNo));
  });

  const updateProductZone = async (product: Product, zone: ProductZone) => {
    if (productBusyId) return;
    setProductBusyId(product.id);
    try {
      const updates = getProductZoneUpdates(zone);
      await updateProduct(product.id, updates);
      addNotification('success', '商品展示区已更新', `${product.styleNo} 已调整为${zone === 'private' ? '授权订货区' : zone === 'clearance' ? '特价区（倒货）' : '新款区'}`);
      setSelectedProduct(previous => previous?.id === product.id ? { ...previous, ...updates } : previous);
    } catch (error) {
      addNotification('warning', '商品权限更新失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setProductBusyId(null);
    }
  };

  const toggleProductSetting = async (
    product: Product,
    setting: 'published' | 'wholesale' | 'private',
    enabled: boolean
  ) => {
    if (productBusyId) return;
    setProductBusyId(product.id);
    const nextVisibility = setting === 'private'
      ? (enabled ? 'private' : 'public')
      : setting === 'wholesale'
        ? (enabled ? 'wholesale' : 'public')
        : product.visibility;
    const nextLifecycleStatus = setting === 'published'
      ? (enabled ? 'published' : 'draft')
      : product.lifecycleStatus;
    try {
      await updateProduct(product.id, {
        visibility: nextVisibility,
        lifecycleStatus: nextLifecycleStatus,
        isExclusiveProtected: nextVisibility === 'private',
        protectionLevel: nextVisibility === 'private' ? 'exclusive_vault' : 'public'
      });
      setSelectedProduct(previous => previous?.id === product.id
        ? {
            ...previous,
            visibility: nextVisibility,
            lifecycleStatus: nextLifecycleStatus,
            isExclusiveProtected: nextVisibility === 'private',
            protectionLevel: nextVisibility === 'private' ? 'exclusive_vault' : 'public'
          }
        : previous);
      addNotification('success', '商品设置已更新', `${product.styleNo} ${setting === 'published' ? (enabled ? '已上架' : '已下架') : enabled ? '已开启' : '已关闭'}`);
    } catch (error) {
      addNotification('warning', '商品设置保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setProductBusyId(null);
    }
  };

  const openProductEditor = (product: Product) => {
    if (!productEditUnlocked) return;
    setProductDraft({ ...product });
  };

  const saveProductDraft = async () => {
    if (!productDraft || productDraftBusy) return;
    setProductDraftBusy(true);
    try {
      const updates: Partial<Product> = {
        styleNo: productDraft.styleNo,
        name: productDraft.name,
        category: productDraft.category,
        subCategory: productDraft.subCategory,
        brand: productDraft.brand,
        wholesalePrice: Number(productDraft.wholesalePrice) || 0,
        rrpPrice: Number(productDraft.rrpPrice) || 0,
        moq: Number(productDraft.moq) || 1,
        packSize: Number(productDraft.packSize) || 1,
        fabric: productDraft.fabric,
        description: productDraft.description,
        ...getProductZoneUpdates(getProductZone(productDraft))
      };
      if (productDraft.id) {
        await updateProduct(productDraft.id, updates);
        setSelectedProduct(previous => previous?.id === productDraft.id ? { ...previous, ...updates } : previous);
      } else {
        addProduct({
          styleNo: String(updates.styleNo || `APP-${Date.now().toString(36).toUpperCase()}`),
          name: String(updates.name || '未命名商品'),
          category: String(updates.category || '女装'),
          subCategory: String(updates.subCategory || ''),
          brand: String(updates.brand || currentMerchant?.name || ''),
          season: '2026/27 FW',
          images: productDraft.images || [],
          media: productDraft.media || [],
          wholesalePrice: Number(updates.wholesalePrice) || 0,
          rrpPrice: Number(updates.rrpPrice) || 0,
          costPrice: 0,
          moq: Number(updates.moq) || 1,
          packSize: Number(updates.packSize) || 1,
          status: updates.status || 'new',
          inventoryStatus: 'in_stock',
          origin: 'Made in Italy',
          fabric: String(updates.fabric || ''),
          composition: '',
          weight: '',
          packaging: '',
          washCare: '',
          description: String(updates.description || ''),
          skus: [],
          visibility: updates.visibility || 'public',
          isExclusiveProtected: updates.isExclusiveProtected,
          protectionLevel: updates.protectionLevel,
          lifecycleStatus: 'draft',
          merchantId: currentMerchantId
        });
      }
      setProductDraft(null);
      addNotification('success', productDraft.id ? '商品资料已保存' : '商品草稿已创建', `${updates.styleNo || '新商品'} 已同步`);
    } catch (error) {
      addNotification('warning', '商品资料保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setProductDraftBusy(false);
    }
  };

  const runProductSmartAssistant = () => {
    if (!productDraft || productSmartBusy) return;
    setProductSmartBusy(true);
    setProductSmartAdvice([]);
    window.setTimeout(() => {
      const name = String(productDraft.name || '').trim();
      const category = String(productDraft.category || '').trim();
      const fabric = String(productDraft.fabric || '').trim();
      const description = String(productDraft.description || '').trim();
      const price = Number(productDraft.wholesalePrice) || 0;
      const rrp = Number(productDraft.rrpPrice) || 0;
      const suggestions: string[] = [];
      const updates: Partial<Product> = {};
      if (!name) {
        updates.name = `${category || '意式时装'} · 2026 秋冬系列`;
        suggestions.push('已根据商品分类生成商品名称');
      }
      if (!category) {
        updates.category = '女装';
        suggestions.push('已补充基础分类：女装');
      }
      if (!fabric) {
        updates.fabric = '高品质混纺面料';
        suggestions.push('已补充面料描述，建议发布前按吊牌成分核对');
      }
      if (!description) {
        updates.description = `RUDA 精选${String(updates.name || name || '时装')}，适合精品店与买手店陈列。版型利落，适合秋冬多场景搭配，支持 B2B 批发采购。`;
        suggestions.push('已生成适合买手浏览的商品描述');
      }
      if (price > 0 && rrp > 0) {
        const margin = Math.round(((rrp - price) / rrp) * 100);
        suggestions.push(margin < 35 ? `价格提示：当前建议零售价毛利约 ${margin}%，可考虑提高零售价或复核成本` : `价格健康：当前建议零售价毛利约 ${margin}%`);
      } else {
        suggestions.push('价格提示：请补充批发价和建议零售价，系统才能计算毛利');
      }
      setProductDraft(previous => previous ? { ...previous, ...updates } : previous);
      setProductSmartAdvice(suggestions);
      setProductSmartBusy(false);
    }, 350);
  };

  const productQualityScore = selectedProduct
    ? Math.round(([selectedProduct.name, selectedProduct.category, selectedProduct.subCategory, selectedProduct.brand, selectedProduct.fabric, selectedProduct.description, selectedProduct.images?.length ? 'image' : '', selectedProduct.wholesalePrice > 0 ? 'price' : ''].filter(Boolean).length / 8) * 100)
    : 0;
  const productMargin = selectedProduct && selectedProduct.rrpPrice > 0
    ? Math.round(((selectedProduct.rrpPrice - selectedProduct.wholesalePrice) / selectedProduct.rrpPrice) * 100)
    : null;

  useEffect(() => {
    let active = true;
    setInventoryLoading(true);
    setInventoryError(null);
    void apiGet<{ success: true; balances: MerchantInventoryBalance[] }>('/api/merchant/inventory/balances?pageSize=500')
      .then(result => {
        if (active) setInventoryBalances(result.balances);
      })
      .catch(error => {
        if (active) {
          setInventoryBalances([]);
          setInventoryError(error instanceof Error ? error.message : '库存加载失败');
        }
      })
      .finally(() => {
        if (active) setInventoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentMerchantId]);

  const inventoryByProduct = useMemo(() => {
    const grouped = new Map<string, {
      product: MerchantInventoryBalance['product'];
      balances: MerchantInventoryBalance[];
    }>();
    inventoryBalances.forEach(balance => {
      const existing = grouped.get(balance.product.id);
      if (existing) existing.balances.push(balance);
      else grouped.set(balance.product.id, { product: balance.product, balances: [balance] });
    });
    return Array.from(grouped.values()).filter(({ product }) => {
      const query = searchQuery.trim().toLowerCase();
      return !query || `${product.styleNo} ${product.name}`.toLowerCase().includes(query);
    });
  }, [inventoryBalances, searchQuery]);

  const todaySales = merchantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const newOrdersCount = merchantOrders.filter(o => o.status === 'placed').length;
  const pendingShipCount = merchantOrders.filter(o => o.status === 'picking' || o.status === 'placed').length;
  const pendingCustomerVaultCount = merchantVaultRequests.filter(vr => vr.status === 'pending').length;

  const selectedOrder = selectedOrderToFulfill
    ? merchantOrders.find(order => order.id === selectedOrderToFulfill)
    : undefined;
  const nextFulfillmentAction = selectedOrder?.status === 'placed' || selectedOrder?.status === 'pending'
    ? { status: 'confirmed' as const, label: '确认订单' }
    : selectedOrder?.status === 'confirmed'
      ? { status: 'picking' as const, label: '开始配货' }
      : selectedOrder?.status === 'picking'
        ? { status: 'shipped' as const, label: '确认发货' }
        : null;

  useEffect(() => {
    if (!selectedOrderToFulfill || !selectedOrder || selectedOrder.status !== 'picking') {
      setShipments([]);
      setShipmentQuantities({});
      return;
    }
    let active = true;
    setShipmentsLoading(true);
    void apiGet<{ success: true; shipments: MerchantShipment[] }>(
      `/api/merchant/orders/${encodeURIComponent(selectedOrderToFulfill)}/shipments`
    ).then(result => {
      if (!active) return;
      setShipments(result.shipments);
      const shipped = new Map<string, number>();
      result.shipments.forEach(shipment => shipment.items.forEach(item => {
        shipped.set(item.orderItemId, (shipped.get(item.orderItemId) || 0) + item.quantity);
      }));
      setShipmentQuantities(Object.fromEntries(selectedOrder.items.map(item => [
        item.id,
        Math.max(0, item.quantity - (shipped.get(item.id) || 0))
      ])));
    }).catch(error => {
      if (active) {
        setShipments([]);
        setShipmentQuantities({});
        addNotification('warning', '包裹加载失败', error instanceof Error ? error.message : '请稍后重试');
      }
    }).finally(() => {
      if (active) setShipmentsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedOrderToFulfill, selectedOrder?.status]);

  const handleQuickFulfill = async () => {
    if (!selectedOrder || !nextFulfillmentAction || fulfillmentBusy) return;
    setFulfillmentBusy(true);
    if (nextFulfillmentAction.status === 'shipped') {
      const items = selectedOrder.items
        .map(item => ({ orderItemId: item.id, quantity: Number(shipmentQuantities[item.id] || 0) }))
        .filter(item => item.quantity > 0);
      if (items.length === 0) {
        addNotification('warning', '无法创建包裹', '请至少填写一件本次发货数量');
        setFulfillmentBusy(false);
        return;
      }
      if (!carrier.trim() || !trackingNo.trim()) {
        addNotification('warning', '物流信息不完整', '确认发货前请填写真实承运商和物流单号');
        setFulfillmentBusy(false);
        return;
      }
      try {
        const result = await apiPost<{ success: true; order: Order; shipment: MerchantShipment }>(
          `/api/merchant/orders/${encodeURIComponent(selectedOrder.id)}/shipments`,
          {
            items,
            carrier,
            trackingNumber: trackingNo.trim()
          }
        );
        syncOrderFromServer(result.order);
        addNotification('success', '包裹已创建', `${result.shipment.shipmentNo} 已登记并通知买手`);
        setSelectedOrderToFulfill(null);
        setTrackingNo('');
      } catch (error) {
        addNotification('warning', '包裹创建失败', error instanceof Error ? error.message : '服务端未接受本次发货');
      } finally {
        setFulfillmentBusy(false);
      }
      return;
    }
    const fulfilled = await merchantFulfillOrder(
      selectedOrder.id,
      nextFulfillmentAction.status,
      undefined,
      undefined,
      `商家手机端：${nextFulfillmentAction.label}`
    );
    setFulfillmentBusy(false);
    if (fulfilled) {
      addNotification('success', nextFulfillmentAction.label, `订单 ${selectedOrder.orderNo} 已更新`);
      setSelectedOrderToFulfill(null);
      setTrackingNo('');
    }
  };

  const tabs = [
    { id: 'store', label: mobileText('网店', 'Negozio') },
    { id: 'products', label: mobileText('商品', 'Prodotti') },
    { id: 'ai_home', label: 'AI' },
    { id: 'orders', label: mobileText('订单', 'Ordini'), badge: orderActionCount > 0 ? orderActionCount : undefined },
    { id: 'pos', label: 'POS' }
  ];

  return (
    <div id="merchant-mobile-app-root" className={`min-h-screen bg-[#f5f5f7] text-neutral-900 ${activeTab === 'pos' ? 'overflow-hidden' : 'pb-20'} select-none antialiased`}>
      {!currentMerchant?.isVerified && activeTab !== 'pos' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="text-xs font-semibold">{mobileText('后台已开通，店铺尚未公开', 'Workspace attivo, negozio non ancora pubblico')}</p>
          <p className="mt-1 text-[11px] leading-4 text-amber-900">{mobileText('完成企业资质验证前，店铺和商品不会对外展示或销售。', 'Negozio e prodotti resteranno nascosti fino alla verifica aziendale.')}</p>
        </div>
      )}
      {activeTab !== 'store' && activeTab !== 'pos' && activeTab !== 'ai_home' && (
        <header className="sticky top-0 z-40 flex items-center justify-start bg-[#f5f5f7]/95 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur-xl">
          <button type="button" aria-label={mobileText('商家设置', 'Impostazioni negozio')} onClick={() => { setSettingsSection(null); setActiveTab('profile'); }} className="ml-auto inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-neutral-800 shadow-sm ring-1 ring-neutral-200 active:scale-95">
            {currentMerchant?.logo ? (
              <img
                src={merchantMediaUrl(currentMerchant.logo, DEFAULT_MERCHANT_LOGO)}
                alt=""
                className="h-full w-full object-cover"
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_MERCHANT_LOGO;
                }}
              />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </button>
        </header>
      )}
      {activeTab !== 'pos' && activeTab !== 'ai_home' && <nav className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-neutral-200/60 px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]" aria-label="Tab">
        <div className="grid grid-cols-5 gap-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative min-h-[52px] py-1 px-0.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                <span className={`text-[12px] font-semibold ${isActive ? 'font-bold' : ''}`}>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="absolute right-2 top-1 min-w-[17px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-black text-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-0.5 w-6 h-0.5 bg-neutral-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>}

      <div className={activeTab === 'pos' || activeTab === 'ai_home' ? 'p-0' : `px-4 pt-2 ${mobileSettings.compact ? 'space-y-3' : 'space-y-4'} pb-28`}>
        {activeTab === 'ai_home' && (
          <div className="fixed inset-0 z-[60] bg-white pt-[env(safe-area-inset-top)]">
          <MerchantAiHome
            isIt={mobileItalian}
            merchantId={currentMerchantId}
            merchantName={currentMerchant?.name || ''}
            onExit={() => setActiveTab('store')}
            onNavigate={tab => setActiveTab(tab)}
          />
          </div>
        )}
        {activeTab === 'pos' && currentMerchant && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-[#f5f5f7] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3">
            <button type="button" onClick={() => setActiveTab('store')} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-700">
              <ChevronLeft className="h-4 w-4" />{mobileText('返回', 'Indietro')}
            </button>
            <span className="max-w-[55%] truncate text-xs font-semibold text-neutral-800">{currentMerchant.name}</span>
            <span className="w-14" aria-hidden="true" />
          </div>
          <div className="min-h-0 flex-1">
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-xs text-neutral-500">{mobileText('POS 正在加载…', 'Caricamento POS…')}</div>}>
            <MerchantSmartPos
            mobileMode
            merchantId={currentMerchant.id}
            products={merchantProducts}
            customers={merchantCustomers}
            orders={merchantOrders}
            operationsIntelligence={null}
            merchantName={currentMerchant.name}
            merchantLocation={{
              city: mobileItalian ? currentMerchant.city_it || currentMerchant.city : currentMerchant.city_zh || currentMerchant.city,
              country: mobileItalian ? currentMerchant.country_it || currentMerchant.country : currentMerchant.country_zh || currentMerchant.country,
              address: currentMerchant.showroomAddress
            }}
            isIt={mobileItalian}
            onOrderCreated={async () => {
              const orderResult = await apiGet<{ success: true; orders: Order[] }>('/api/merchant/orders');
              orderResult.orders.forEach(replaceOrderFromServer);
              const productResult = await apiGet<{ success: true; products: Product[] }>('/api/merchant/products');
              replaceMerchantProductsFromServer(currentMerchant.id, productResult.products);
            }}
            onRefreshProducts={async () => {
              const result = await apiGet<{ success: true; products: Product[] }>('/api/merchant/products');
              replaceMerchantProductsFromServer(currentMerchant.id, result.products);
            }}
            onNotify={addNotification}
            onAskAI={async (question, onReply) => {
              try {
                const result = await apiPost<{ reply: string }>('/api/merchant/assistant/query', {
                  question,
                  context: 'dashboard',
                  scope: 'home'
                }, 30_000, { 'Idempotency-Key': `assistant-${crypto.randomUUID()}` });
                onReply(result.reply);
                return true;
              } catch (error) {
                addNotification('warning', 'POS AI 分析失败', error instanceof Error ? error.message : '请稍后重试');
                return false;
              }
            }}
            onOpenMerchantSettings={section => {
              setSettingsSection(section === 'staff' ? 'team' : 'store');
              setActiveTab('profile');
            }}
            />
          </Suspense>
          </div>
          </div>
        )}
        {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-5 text-white shadow-xl shadow-neutral-900/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold text-white/60">{mobileText('今日业绩', 'Oggi')}</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mb-5">
              <span className="text-[32px] font-black tracking-tight leading-none">€{todaySales.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
              <span className="ml-2 text-[13px] text-white/50 font-medium">{mobileText('销售额', 'Vendite')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="text-[10px] text-white/50 block mb-1">{mobileText('新订单', 'Nuovi')}</span>
                <span className="text-[20px] font-bold leading-none">{newOrdersCount}</span>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="text-[10px] text-white/50 block mb-1">{mobileText('待发货', 'Spedire')}</span>
                <span className={`text-[20px] font-bold leading-none ${pendingShipCount > 0 ? 'text-amber-400' : ''}`}>{pendingShipCount}</span>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="text-[10px] text-white/50 block mb-1">{mobileText('新客户', 'Clienti')}</span>
                <span className="text-[20px] font-bold leading-none text-purple-400">{pendingCustomerVaultCount}</span>
              </div>
            </div>
            {financeSummary && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-[9px] text-white/40 mb-0.5">{mobileText('营业额', 'Lordo')}</span>
                  <span className="text-[13px] font-bold text-white/90">€{(financeSummary.totalGross || 0).toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-white/40 mb-0.5">{mobileText('费用', 'Costi')}</span>
                  <span className="text-[13px] font-bold text-white/70">€{(financeSummary.totalFees || 0).toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-white/40 mb-0.5">{mobileText('净收入', 'Netto')}</span>
                  <span className="text-[13px] font-bold text-emerald-400">€{(financeSummary.totalNet || 0).toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {(activeTab === 'products' || activeTab === 'orders' || activeTab === 'inventory' || activeTab === 'customers') && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'products' ? '搜索款号、品名...' : activeTab === 'orders' ? '搜索订单号、客户...' : activeTab === 'customers' ? '搜索公司、联系人...' : '搜索款号...'}
              className="w-full pl-10 pr-4 py-3 bg-white text-[14px] rounded-2xl border-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-neutral-900/5 placeholder:text-neutral-400"
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: mobileText('库存', 'Stock'), icon: Boxes, color: 'from-amber-400 to-orange-500', action: () => setActiveTab('inventory') },
                { label: mobileText('商品', 'Products'), icon: Package, color: 'from-blue-400 to-indigo-500', action: () => setActiveTab('products') },
                { label: mobileText('订单', 'Orders'), icon: Truck, color: 'from-emerald-400 to-teal-500', action: () => setActiveTab('orders') },
                { label: mobileText('客户', 'Clients'), icon: Users, color: 'from-purple-400 to-fuchsia-500', action: () => setActiveTab('customers') }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button key={idx} type="button" onClick={item.action} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-neutral-900 shadow-lg shadow-black/5">
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-700">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[13px] font-bold text-neutral-900">{mobileText('生产运营', 'Produzione')}</span>
                </div>
                <button type="button" onClick={() => void refreshFactoryData()} disabled={factoryLoading} className="text-[11px] font-semibold text-neutral-500 active:opacity-60 disabled:opacity-40">
                  {factoryLoading ? mobileText('同步中', 'Sync') : mobileText('刷新', 'Refresh')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-4">
                <div className={`rounded-2xl p-3.5 ${lowMaterialCount ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <span className={`block text-[10px] font-medium ${lowMaterialCount ? 'text-rose-500' : 'text-emerald-600'}`}>{mobileText('物料预警', 'Materiali')}</span>
                  <strong className={`mt-1 block text-[22px] font-black ${lowMaterialCount ? 'text-rose-700' : 'text-emerald-700'}`}>{lowMaterialCount}</strong>
                  <span className="text-[10px] text-neutral-500">{factoryMaterials.length} {mobileText('项台账', 'registri')}</span>
                </div>
                <div className="rounded-2xl p-3.5 bg-indigo-50 border border-indigo-100">
                  <span className="block text-[10px] font-medium text-indigo-500">{mobileText('进行工单', 'Lavori')}</span>
                  <strong className="mt-1 block text-[22px] font-black text-indigo-700">{activeWorkOrders.length}</strong>
                  <span className="text-[10px] text-neutral-500">{mobileText('计划生产', 'in corso')}</span>
                </div>
              </div>
              {(lowMaterialCount > 0 || activeWorkOrders.length > 0) && (
                <div className="space-y-2 border-t border-neutral-100 p-3.5">
                  {factoryMaterials.filter(m => m.availableQuantity <= m.reorderPoint).slice(0, 2).map(material => (
                    <div key={material.id} className="flex items-center justify-between rounded-2xl bg-rose-50 px-3 py-2.5">
                      <span className="truncate pr-2 text-[11px]"><strong className="text-rose-800">{material.code}</strong> <span className="text-rose-700/70">· {material.name}</span></span>
                      <span className="shrink-0 text-[11px] font-bold text-rose-700">{material.availableQuantity.toFixed(0)}/{material.reorderPoint.toFixed(0)}</span>
                    </div>
                  ))}
                  {activeWorkOrders.slice(0, 2).map(workOrder => (
                    <div key={workOrder.id} className="flex items-center justify-between gap-2 rounded-2xl bg-indigo-50 px-3 py-2.5">
                      <span className="min-w-0 truncate text-[11px]"><strong className="text-indigo-800">{workOrder.workOrderNo}</strong> <span className="text-indigo-700/70">· {workOrder.product.styleNo}</span></span>
                      <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => void advanceWorkOrder(workOrder)} disabled={!['draft', 'released', 'in_progress', 'qc_hold'].includes(workOrder.status) || factoryBusyId === workOrder.id} className="rounded-xl bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-40 active:scale-95">
                          {factoryBusyId === workOrder.id ? '...' : workOrder.status === 'draft' ? mobileText('释放', 'Rilascia') : workOrder.status === 'released' ? mobileText('开工', 'Avvia') : workOrder.status === 'in_progress' ? mobileText('质检', 'QC') : mobileText('继续', 'Vai')}
                        </button>
                        {['released', 'in_progress', 'qc_hold'].includes(workOrder.status) && (
                          <button type="button" onClick={() => setReportingWorkOrder(workOrder)} className="rounded-xl border border-indigo-300 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 active:scale-95">{mobileText('报产', 'Report')}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-neutral-100 p-3.5">
                <button type="button" onClick={() => { setShowMaterialManager(value => !value); if (!showMaterialManager) void refreshFactoryMaterials(); }} className="flex w-full items-center justify-between rounded-xl bg-neutral-950 px-3 py-2.5 text-left text-[11px] font-bold text-white">
                  <span>{showMaterialManager ? '收起面辅料管理' : '管理面料 / 辅料 · 新建、编辑、入库'}</span><ChevronRight className={`h-4 w-4 transition-transform ${showMaterialManager ? 'rotate-90' : ''}`} />
                </button>
                {showMaterialManager && <div className="mt-3 space-y-3">
                  <form onSubmit={event => void saveFactoryMaterial(event)} className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="text-[11px]">{editingMaterialId ? '编辑面辅料资料' : '创建面料 / 辅料档案'}</strong>{editingMaterialId && <button type="button" onClick={() => openMaterialEditor()} className="text-[10px] font-semibold text-neutral-500">取消编辑</button>}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input required maxLength={80} value={materialForm.code} onChange={event => setMaterialForm(previous => ({ ...previous, code: event.target.value }))} placeholder="物料编码" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                      <input required maxLength={200} value={materialForm.name} onChange={event => setMaterialForm(previous => ({ ...previous, name: event.target.value }))} placeholder="面料 / 辅料名称" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                      <select value={materialForm.category} onChange={event => setMaterialForm(previous => ({ ...previous, category: event.target.value }))} className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]"><option value="fabric">面料</option><option value="lining">里料</option><option value="trim">辅料 / 配件</option><option value="label">标签 / 标牌</option><option value="packaging">包装材料</option><option value="other">其他</option></select>
                      <select value={materialForm.unit} disabled={editingMaterialUnitLocked} onChange={event => setMaterialForm(previous => ({ ...previous, unit: event.target.value }))} className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px] disabled:bg-neutral-100"><option value="meter">米</option><option value="piece">件 / 个</option><option value="kg">千克</option><option value="roll">卷</option></select>
                      <input type="number" min="0" step="0.0001" value={materialForm.unitCost} onChange={event => setMaterialForm(previous => ({ ...previous, unitCost: event.target.value }))} placeholder="单位成本 (€)" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                      <input type="number" min="0" step="0.001" value={materialForm.reorderPoint} onChange={event => setMaterialForm(previous => ({ ...previous, reorderPoint: event.target.value }))} placeholder="安全库存" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                      <input type="number" min="0" step="1" value={materialForm.leadTimeDays} onChange={event => setMaterialForm(previous => ({ ...previous, leadTimeDays: event.target.value }))} placeholder="采购交期（天）" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                      <select value={materialForm.status} onChange={event => setMaterialForm(previous => ({ ...previous, status: event.target.value }))} className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]"><option value="active">启用</option><option value="suspended">停用</option></select>
                      <textarea maxLength={2000} rows={2} value={materialForm.notes} onChange={event => setMaterialForm(previous => ({ ...previous, notes: event.target.value }))} placeholder="规格备注：成分、克重、幅宽、颜色号等" className="col-span-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[11px]" />
                    </div>
                    {editingMaterialUnitLocked && <p className="text-[10px] text-neutral-500">物料已有库存流水或 BOM 关联，计量单位不可更改，以避免历史数据口径错乱。</p>}
                    <button type="submit" disabled={materialBusy} className="w-full rounded-lg bg-neutral-900 py-2.5 text-[11px] font-bold text-white disabled:opacity-50">{materialBusy ? '保存中…' : editingMaterialId ? '保存物料修改' : '创建物料'}</button>
                  </form>
                  <form onSubmit={event => void receiveFactoryMaterial(event)} className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <strong className="block text-[11px] text-emerald-900">收货入库</strong>
                    <select value={materialInbound.materialId} onChange={event => setMaterialInbound(previous => ({ ...previous, materialId: event.target.value }))} className="w-full rounded-lg border border-emerald-100 bg-white px-2.5 py-2 text-[11px]">
                      <option value="">选择启用中的面辅料</option>
                      {factoryMaterials.filter(material => material.status === 'active').map(material => <option key={material.id} value={material.id}>{material.code} · {material.name}（{material.unit}）</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2"><input required type="number" min="0.001" step="0.001" value={materialInbound.quantity} onChange={event => setMaterialInbound(previous => ({ ...previous, quantity: event.target.value }))} placeholder={`收货数量 ${factoryMaterials.find(material => material.id === materialInbound.materialId)?.unit || ''}`} className="min-w-0 rounded-lg border border-emerald-100 bg-white px-2.5 py-2 text-[11px]" /><input maxLength={500} value={materialInbound.note} onChange={event => setMaterialInbound(previous => ({ ...previous, note: event.target.value }))} placeholder="送货单 / 备注" className="min-w-0 rounded-lg border border-emerald-100 bg-white px-2.5 py-2 text-[11px]" /></div>
                    <button type="submit" disabled={materialBusy || !factoryMaterials.some(material => material.id === materialInbound.materialId && material.status === 'active')} className="w-full rounded-lg bg-emerald-700 py-2.5 text-[11px] font-bold text-white disabled:opacity-50">{materialBusy ? '处理中…' : '确认收货入库'}</button>
                  </form>
                  <div className="space-y-2">
                    {factoryMaterials.map(material => <div key={material.id} className="rounded-xl border border-neutral-100 bg-white p-3">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-[11px]">{material.code} · {material.name}</strong><span className="mt-1 block text-[10px] text-neutral-500">{material.category} · {material.unit} · 成本 €{material.unitCost.toFixed(4)} · 安全库存 {material.reorderPoint} · {material.status === 'active' ? '启用' : '停用'}</span><span className="mt-1 block text-[10px] font-semibold text-emerald-700">可用 {material.availableQuantity.toFixed(3)} / 现有 {material.onHandQuantity.toFixed(3)} {material.unit}</span></div><button type="button" onClick={() => openMaterialEditor(material)} className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-bold text-neutral-700">编辑</button></div>
                    </div>)}
                    {factoryMaterials.length === 0 && <p className="rounded-lg bg-neutral-50 p-3 text-center text-[10px] text-neutral-500">暂无物料档案；可先创建面料或辅料，再登记收货。</p>}
                  </div>
                </div>}
              </div>
              {factoryMaterials.length === 0 && factoryWorkOrders.length === 0 && !factoryLoading && (
                <div className="border-t border-neutral-100 px-4 py-4 text-[11px] text-neutral-400 text-center">{mobileText('暂无生产数据', 'Nessun dato produzione')}</div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
                <span className="text-[13px] font-bold text-neutral-900">{mobileText('待处理订单', 'Da evadere')}</span>
                <button type="button" onClick={() => setActiveTab('orders')} className="text-[11px] font-bold text-neutral-900 flex items-center gap-0.5 active:opacity-60">
                  {mobileText('全部', 'Tutti')} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {filteredMerchantOrders.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                  {filteredMerchantOrders.slice(0, 4).map(order => (
                    <button type="button" key={order.id} onClick={() => setActiveTab('orders')} className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-neutral-50">
                      <div className="min-w-0">
                        <span className="block text-[12px] font-bold text-neutral-900 font-mono">{order.orderNo}</span>
                        <span className="block text-[11px] text-neutral-500 truncate max-w-[180px]">{order.companyName}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[12px] font-bold text-neutral-900">€{order.totalAmount.toFixed(0)}</span>
                        <span className="block text-[10px] font-semibold text-amber-600">
                          {order.status === 'placed' || order.status === 'pending' ? mobileText('待确认', 'Conf.') : order.status === 'confirmed' ? mobileText('配货中', 'Prepara') : order.status === 'picking' ? mobileText('待发货', 'Spedisci') : order.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-[11px] text-neutral-400">{mobileText('暂无待处理订单', 'Nessun ordine')}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <button type="button" disabled={!productEditUnlocked} onClick={() => setShowNewProductDialog(true)} className="h-10 px-4 rounded-2xl bg-neutral-900 text-white text-[12px] font-bold flex items-center gap-1.5 shadow-md shadow-neutral-900/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                <Plus className="w-4 h-4" />
                {mobileText('添加商品', 'Nuovo prodotto')}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={productEditUnlocked}
                onClick={() => setProductEditUnlocked(value => !value)}
                className={`h-10 shrink-0 rounded-2xl px-3 text-[11px] font-black transition-colors ${productEditUnlocked ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
              >
                {productEditUnlocked ? '🔓 编辑已开启' : '🔒 编辑开关'}
              </button>
              <select value={productCategory} onChange={event => setProductCategory(event.target.value)} className="h-10 flex-1 rounded-2xl bg-white px-3.5 text-[12px] font-medium text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:outline-none border-0 appearance-none">
                <option value="all">{mobileText('全部类目', 'Tutte')}</option>
                {productCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="rounded-3xl bg-neutral-950 p-4 text-white shadow-lg shadow-neutral-900/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wide"><Sparkles className="h-3.5 w-3.5" /> {mobileText('智能商品工作台', 'Workspace prodotti intelligente')}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 p-2.5"><span className="block text-[9px] text-white/50">{mobileText('商品总数', 'Prodotti totali')}</span><strong className="mt-1 block text-lg">{merchantProducts.length}</strong></div>
                <div className="rounded-2xl bg-white/10 p-2.5"><span className="block text-[9px] text-white/50">{mobileText('低库存', 'Scorte basse')}</span><strong className="mt-1 block text-lg">{merchantProducts.filter(p => p.inventoryStatus === 'low_stock').length}</strong></div>
                <div className="rounded-2xl bg-white/10 p-2.5"><span className="block text-[9px] text-white/50">{mobileText('待完善', 'Da completare')}</span><strong className="mt-1 block text-lg">{merchantProducts.filter(p => !p.description || !p.fabric || !p.images?.length).length}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                [mobileText('全部', 'Tutti'), merchantProducts.length, 'all'],
                [mobileText('已上架', 'Pubblicati'), merchantProducts.filter(p => (p.lifecycleStatus || 'published') === 'published').length, 'published'],
                [mobileText('私密', 'Privati'), merchantProducts.filter(p => p.visibility === 'private').length, 'private'],
                [mobileText('低库存', 'Basso'), merchantProducts.filter(p => p.inventoryStatus === 'low_stock').length, 'low_stock']
              ].map(([label, count, filter]) => (
                <button type="button" key={filter as string} onClick={() => setProductFilter(filter as typeof productFilter)} className={`rounded-2xl p-3.5 text-left active:scale-[0.98] transition-all ${productFilter === filter ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/15' : 'bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}>
                  <span className={`block text-[10px] font-medium ${productFilter === filter ? 'text-white/60' : 'text-neutral-500'}`}>{label as string}</span>
                  <span className="mt-0.5 block text-[22px] font-black leading-none">{count as number}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-neutral-500">{visibleProducts.length} {mobileText('件商品', 'articoli')}</span>
              <select value={productSort} onChange={event => setProductSort(event.target.value as typeof productSort)} className="bg-transparent text-[11px] font-semibold text-neutral-700 outline-none border-0">
                <option value="updated">{mobileText('最新款号', 'Nuovi')}</option>
                <option value="stock">{mobileText('库存低→高', 'Scorta')}</option>
                <option value="price">{mobileText('价格高→低', 'Prezzo')}</option>
              </select>
            </div>

            <div className="space-y-2.5">
              {visibleProducts.map((p) => (
                <button type="button" key={p.id} onClick={() => setSelectedProduct(p)} className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform">
                  <div className="relative shrink-0">
                    <ProductImage src={p.images[0]} alt={p.name} contain className="w-[68px] h-[68px] rounded-2xl bg-neutral-50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-mono text-[12px] font-black text-neutral-900 tracking-tight">{p.styleNo}</span>
                        <span className="block text-[12px] text-neutral-600 truncate mt-0.5 leading-snug">{p.name}</span>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${p.visibility === 'private' ? 'bg-purple-100 text-purple-700' : p.visibility === 'wholesale' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {getProductZone(p) === 'private' ? '🔒 授权订货区' : getProductZone(p) === 'clearance' ? '🏷️ 特价区' : '✨ 新款区'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-[15px] font-black text-neutral-900">€{p.wholesalePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className={`text-[10px] font-bold ${p.inventoryStatus === 'low_stock' ? 'text-rose-600' : p.inventoryStatus === 'pre_order' ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {p.inventoryStatus === 'low_stock' ? mobileText('低库存', 'Basso') : p.inventoryStatus === 'pre_order' ? mobileText('预售', 'Pre') : mobileText('现货', 'OK')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-300" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-neutral-400">{p.skus.length} SKU</span>
                      {p.category && <><span className="text-[10px] text-neutral-300">·</span><span className="text-[10px] font-medium text-neutral-400 truncate">{p.category}</span></>}
                    </div>
                  </div>
                </button>
              ))}
              {visibleProducts.length === 0 && (
                merchantProducts.length === 0 ? (
                  <div className="rounded-3xl bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center mb-4 shadow-inner">
                        <Boxes className="w-8 h-8 text-neutral-400" />
                      </div>
                      <h4 className="text-[15px] font-black text-neutral-900 mb-1.5">{mobileText('还没有商品', 'Catalogo vuoto')}</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mb-5 max-w-[260px]">
                        {mobileText('添加您的第一个商品开始在平台展示和销售', 'Aggiungi il tuo primo prodotto per iniziare a vendere')}
                      </p>
                      <button type="button" onClick={() => setShowNewProductDialog(true)} className="h-11 px-6 rounded-2xl bg-neutral-900 text-white text-[12px] font-black flex items-center gap-1.5 shadow-lg shadow-neutral-900/15 active:scale-[0.98] transition-transform">
                        <Plus className="w-4 h-4" />
                        {mobileText('添加第一个商品', 'Aggiungi prodotto')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                    <p className="text-[12px] text-neutral-400 font-medium">{mobileText('没有符合条件的商品', 'Nessun articolo trovato')}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4 animate-fadeIn">
            {inventoryLoading && (
              <div className="rounded-3xl bg-white p-8 text-center text-[12px] text-neutral-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {mobileText('读取库存中...', 'Caricamento scorte...')}
              </div>
            )}
            {inventoryError && !inventoryLoading && (
              <div className="rounded-3xl bg-rose-50 border border-rose-100 p-4 text-[12px] text-rose-700">
                ⚠️ {inventoryError}
              </div>
            )}
            {!inventoryLoading && !inventoryError && inventoryByProduct.length === 0 && (
              <div className="rounded-3xl bg-white p-10 text-center text-[12px] text-neutral-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {mobileText('暂无库存数据', 'Nessuna scorta')}
              </div>
            )}
            <div className="space-y-3">
              {inventoryByProduct.map(({ product, balances }) => {
                const totalStock = balances.reduce((sum, balance) => sum + balance.onHandQuantity, 0);
                const totalAvailable = balances.reduce((sum, balance) => sum + balance.availableQuantity, 0);
                const isLow = totalStock < 30;
                const productImage = merchantProducts.find(item => item.id === product.id)?.images[0];

                return (
                  <div key={product.id} className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ProductImage src={productImage} alt={product.name} contain className="w-12 h-12 rounded-2xl bg-neutral-50 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[13px] font-black text-neutral-900 tracking-tight">{product.styleNo}</div>
                          <div className="text-[11px] text-neutral-500 truncate mt-0.5">{product.name}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9px] font-medium text-neutral-400">{mobileText('可售/在库', 'Disp./Tot.')}</div>
                        <div className={`text-[15px] font-black ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {totalAvailable}<span className="text-neutral-300 text-[11px] font-bold">/{totalStock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-100">
                      {balances.map(balance => (
                        <div key={balance.id} className="rounded-2xl bg-neutral-50 p-2.5 text-center">
                          <span className="text-[9px] font-medium text-neutral-400 block truncate">{balance.location.name}</span>
                          <span className="font-bold text-[13px] text-neutral-800 block">{balance.availableQuantity}</span>
                          {balance.inTransitQuantity > 0 && (
                            <span className="text-[9px] font-bold text-blue-600 block mt-0.5">+{balance.inTransitQuantity} {mobileText('在途', 'transito')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-slate-800 to-neutral-900 p-5 text-white shadow-xl shadow-neutral-900/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60"><Truck className="w-3.5 h-3.5" />{mobileText('订单', 'Ordini')}</div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">{merchantOrders.length}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('待处理', 'Da fare')}</span>
                  <strong className="text-[20px] font-black">{orderActionCount}</strong>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('退货', 'Resi')}</span>
                  <strong className={`text-[20px] font-black ${orderReturnCount ? 'text-rose-400' : ''}`}>{orderReturnCount}</strong>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('总额', 'Totale')}</span>
                  <strong className="text-[15px] font-black">€{orderRevenue.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {orderAlertCount > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-2xl bg-neutral-900 px-3 py-2.5 text-white">
                  <Bell className="h-4 w-4" />
                  <span className="flex-1 text-[11px] font-bold">{orderAlertCount} 笔订单需要处理</span>
                  <button type="button" onClick={() => setOrderAlertCount(0)} className="text-[10px] text-white/60">知道了</button>
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input value={orderQuery} onChange={event => setOrderQuery(event.target.value)} placeholder={mobileText('搜索订单号、客户...', 'Cerca ordine, cliente...')} className="w-full rounded-2xl bg-neutral-50 py-2.5 pl-10 pr-4 text-[12px] outline-none border-0 focus:ring-2 focus:ring-neutral-900/5" />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                {[
                  ['all', mobileText('全部', 'Tutti')],
                  ['action', mobileText('待处理', 'Attivi')],
                  ['shipping', mobileText('已发货', 'Spediti')],
                  ['completed', mobileText('已完成', 'Completati')],
                  ['returns', mobileText('退货', 'Resi')]
                ].map(([filter, label]) => (
                  <button type="button" key={filter as string} onClick={() => setOrderFilter(filter as typeof orderFilter)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${orderFilter === filter ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600'}`}>
                    {label as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredMerchantOrders.map((o) => (
                <div key={o.id} className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setSelectedOrderDetail(o)} className="min-w-0 text-left flex-1">
                        <span className="font-mono text-[12px] font-black text-neutral-900 tracking-tight">{o.orderNo}</span>
                        <span className="block text-[11px] text-neutral-500 truncate mt-0.5">{o.companyName}</span>
                      </button>
                      <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded-full ${
                        o.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                        o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                        o.status === 'return_requested' || o.refundStatus === 'requested' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {o.status === 'shipped' ? mobileText('已发货', 'Spedito') : o.status === 'delivered' ? mobileText('已签收', 'Consegnato') : o.status === 'return_requested' || o.refundStatus === 'requested' ? mobileText('退货', 'Reso') : mobileText('待处理', 'Attivo')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-50">
                      <span className="text-[10px] text-neutral-400">{o.items.length} {mobileText('款', 'mod.')} · {o.items.reduce((s, i) => s + i.quantity, 0)} {mobileText('件', 'pz.')}</span>
                      <span className="text-[16px] font-black text-neutral-900">€{o.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  {o.refundStatus === 'requested' ? (
                    <div className="flex gap-2 px-4 pb-4">
                      <button onClick={() => approveReturn(o.id, o.refundAmount)} className="flex-1 h-9 rounded-2xl bg-emerald-600 text-white text-[11px] font-bold active:scale-95 transition-transform">{mobileText('批准退款', 'Approva')}</button>
                      <button onClick={() => rejectReturn(o.id)} className="flex-1 h-9 rounded-2xl bg-neutral-100 text-neutral-700 text-[11px] font-bold active:scale-95 transition-transform">{mobileText('拒绝', 'Rifiuta')}</button>
                    </div>
                  ) : ['placed', 'pending', 'confirmed', 'picking'].includes(o.status) && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => setSelectedOrderToFulfill(o.id)}
                        className="w-full h-10 rounded-2xl bg-neutral-900 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-md shadow-neutral-900/10"
                      >
                        <Truck className="w-4 h-4" />
                        <span>
                          {o.status === 'placed' || o.status === 'pending'
                            ? mobileText('确认订单', 'Conferma')
                            : o.status === 'confirmed'
                              ? mobileText('开始配货', 'Prepara')
                              : mobileText('确认发货', 'Spedisci')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredMerchantOrders.length === 0 && <div className="rounded-3xl bg-white p-10 text-center text-[12px] text-neutral-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">{mobileText('没有符合条件的订单', 'Nessun ordine')}</div>}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="overflow-hidden flex-1 rounded-3xl bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 text-white shadow-xl shadow-purple-900/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60"><Users className="w-3.5 h-3.5" />{mobileText('客户', 'Clienti')}</div>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">{merchantCustomers.length}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur">
                    <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('好客户', 'Buoni clienti')}</span>
                    <strong className="text-[18px] font-black">{goodCustomerCount}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur">
                    <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('采购额', 'Fatturato')}</span>
                    <strong className="text-[14px] font-black">€{customerRevenue.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur">
                    <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('欠钱客户', 'Clienti insolventi')}</span>
                    <strong className={`text-[18px] font-black ${overdueCustomerCount ? 'text-rose-400' : 'text-emerald-400'}`}>{overdueCustomerCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input value={customerQuery} onChange={event => setCustomerQuery(event.target.value)} placeholder={mobileText('搜索公司、联系人...', 'Cerca azienda, contatto...')} className="w-full rounded-2xl bg-neutral-50 py-2.5 pl-10 pr-4 text-[12px] outline-none border-0 focus:ring-2 focus:ring-neutral-900/5" />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                {[
                  ['all', mobileText('全部', 'Tutti')],
                  ['good_customer', mobileText('好客户', 'Buoni clienti')],
                  ['regular_customer', mobileText('熟客户', 'Clienti abituali')],
                  ['new_customer', mobileText('新客户', 'Nuovi clienti')],
                  ['overdue_customer', mobileText('欠钱客户', 'Clienti insolventi')]
                ].map(([filter, label]) => (
                  <button type="button" key={filter as string} onClick={() => setCustomerFilter(filter as typeof customerFilter)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${customerFilter === filter ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600'}`}>
                    {label as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-neutral-500">{filteredMerchantCustomers.length} {mobileText('位客户', 'clienti')}</span>
                <select value={customerSort} onChange={event => setCustomerSort(event.target.value as typeof customerSort)} className="h-8 rounded-2xl border-0 bg-neutral-100 px-2.5 text-[11px] font-bold text-neutral-700 outline-none">
                  <option value="value">采购额最高</option>
                  <option value="latest">最近更新</option>
                  <option value="orders">订单最多</option>
                  <option value="risk">风险优先</option>
                </select>
              </div>
              <button type="button" onClick={() => setShowCustomerActions(true)} className="flex h-8 items-center gap-1 rounded-2xl bg-neutral-900 px-3 text-[11px] font-bold text-white shadow-md shadow-neutral-900/10 transition-transform active:scale-95">
                <Plus className="w-3.5 h-3.5" />{mobileText('新增', 'Nuovo')}
              </button>
            </div>

            {showCustomerActions && (
              <div className="fixed inset-0 z-[75] flex items-end justify-center bg-neutral-950/50 p-0 sm:items-center sm:p-4" onClick={() => setShowCustomerActions(false)}>
                <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
                  <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-neutral-950">客户操作</h3><p className="mt-1 text-xs text-neutral-500">创建或导入买手客户档案</p></div><button type="button" onClick={() => setShowCustomerActions(false)} className="rounded-full bg-neutral-100 p-2 text-neutral-500"><X className="h-4 w-4" /></button></div>
                  <div className="mt-5 grid gap-2">
                    <button type="button" onClick={() => { setShowCustomerActions(false); setEditingCustomerId(null); setShowCustomerForm(true); }} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:border-neutral-900"><strong className="block text-sm text-neutral-900">新建客户</strong><span className="mt-1 block text-xs text-neutral-500">创建买手公司、联系人、VAT 和合作资料</span></button>
                    <label className="cursor-pointer rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:border-neutral-900"><strong className="block text-sm text-neutral-900">导入客户</strong><span className="mt-1 block text-xs text-neutral-500">选择 CSV 文件后导入客户档案，重复邮箱或 VAT 会跳过</span><input type="file" accept=".csv,text/csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.currentTarget.value = ''; setShowCustomerActions(false); if (file) void importMobileCustomers(file); }} /></label>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredMerchantCustomers.map(({ customer, orders: customerOrders, orderValue, lastOrder, creditRatio, vaultRequest }) => (
                <button type="button" key={customer.id} onClick={() => setSelectedCustomer(customer)} className="w-full rounded-3xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-[14px] font-black text-purple-700">{(customer.companyName || customer.contactPerson || '?').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-neutral-900 truncate">{customer.companyName}</span>
                        <span className="block text-[11px] text-neutral-500 truncate mt-0.5">{customer.contactPerson || '未填写联系人'} · {customer.city || customer.country || '未填写地区'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black ${customer.status === 'approved' ? 'bg-neutral-900 text-white' : customer.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600'}`}>
                        {customer.status === 'approved' ? mobileText('已认证', 'OK') : customer.status === 'rejected' ? mobileText('拒绝', 'NO') : mobileText('待审', 'Attesa')}
                      </span>
                      <span className="text-[9px] font-bold text-neutral-500">{customerLevelLabel[customer.customerLevel || 'new_customer']}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-neutral-50">
                    <div className="text-center">
                      <span className="block text-[9px] font-medium text-neutral-400 mb-0.5">{mobileText('订单', 'Ordini')}</span>
                      <span className="text-[15px] font-black text-neutral-900">{customerOrders.length}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-medium text-neutral-400 mb-0.5">{mobileText('采购', 'Acquisti')}</span>
                      <span className="text-[13px] font-black text-neutral-900">€{orderValue.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-medium text-neutral-400 mb-0.5">{mobileText('跟进', 'Stato')}</span>
                      <span className={`text-[10px] font-bold ${creditRatio >= 0.8 ? 'text-rose-600' : vaultRequest?.status === 'pending' ? 'text-purple-600' : vaultRequest?.status === 'approved' ? 'text-emerald-600' : 'text-neutral-500'}`}>
                        {creditRatio >= 0.8 ? mobileText('风险', 'Rischio') : vaultRequest?.status === 'pending' ? mobileText('看货', 'Vault') : vaultRequest?.status === 'approved' ? mobileText('已授权', 'OK') : mobileText('正常', 'OK')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {filteredMerchantCustomers.length === 0 && <div className="rounded-3xl bg-white p-10 text-center text-[12px] text-neutral-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">{mobileText('暂无客户数据', 'Nessun cliente')}</div>}
            </div>

            {selectedCustomer && (() => {
              const metric = customerMetrics.find(item => item.customer.id === selectedCustomer.id);
              const request = metric?.vaultRequest;
              return (
                <div className="fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/50 p-0 sm:items-center sm:p-4" onClick={() => setSelectedCustomer(null)}>
                  <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
                    <div className="flex items-start justify-between">
                      <div><h3 className="text-base font-bold text-neutral-950">{selectedCustomer.companyName}</h3><p className="mt-1 text-xs text-neutral-500">{selectedCustomer.contactPerson} · {selectedCustomer.businessType}</p></div>
                      <button type="button" onClick={() => setSelectedCustomer(null)} className="rounded-full bg-neutral-100 p-2 text-neutral-500"><X className="h-4 w-4" /></button>
                    </div>
                    <button type="button" onClick={() => openCustomerEditor(selectedCustomer)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 text-xs font-bold text-neutral-800"><Pencil className="h-3.5 w-3.5" />编辑客户资料</button>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-neutral-50 p-3"><span className="text-[10px] text-neutral-500">累计采购额</span><strong className="mt-1 block text-lg">€{(metric?.orderValue || 0).toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong></div>
                      <div className="rounded-xl bg-neutral-50 p-3"><span className="text-[10px] text-neutral-500">订单数量</span><strong className="mt-1 block text-lg">{metric?.orders.length || 0}</strong></div>
                    </div>
                    <div className="mt-4 space-y-2 text-xs">
                      <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3"><Mail className="h-4 w-4 text-neutral-500" />{selectedCustomer.email}</a>
                      <a href={`tel:${selectedCustomer.phone}`} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3"><Phone className="h-4 w-4 text-neutral-500" />{selectedCustomer.phone}</a>
                      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3"><MapPin className="h-4 w-4 text-neutral-500" />{selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.country}</div>
                      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3"><CreditCard className="h-4 w-4 text-neutral-500" />信用额度 €{Number(selectedCustomer.creditLimit || 0).toLocaleString(getIntlLocale(lang))} · 已用 €{Number(selectedCustomer.usedCredit || 0).toLocaleString(getIntlLocale(lang))}</div>
                    </div>
                    {request?.status === 'pending' && (
                      <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-4">
                        <button type="button" onClick={() => { void approveVaultAccess(request.id); setSelectedCustomer(null); }} className="flex-1 rounded-lg bg-neutral-950 py-2.5 text-xs font-bold text-white">授权私密货盘</button>
                        <button type="button" onClick={() => { void rejectVaultAccess(request.id); setSelectedCustomer(null); }} className="flex-1 rounded-lg bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-700">拒绝申请</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            {showCustomerForm && (
              <div className="fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/50 p-0 sm:items-center sm:p-4" onClick={() => setShowCustomerForm(false)}>
                <form onSubmit={editingCustomerId ? saveMobileCustomer : createMobileCustomer} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
                  <div className="flex items-start justify-between">
                    <div><h3 className="text-base font-bold text-neutral-950">{editingCustomerId ? '编辑客户资料' : '新增合作客户'}</h3><p className="mt-1 text-xs text-neutral-500">公司名称和电话必填，其余信息可稍后补充。</p></div>
                    <button type="button" onClick={() => { setShowCustomerForm(false); setEditingCustomerId(null); }} className="rounded-full bg-neutral-100 p-2 text-neutral-500"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {[
                      ['companyName', '公司名称 *', 'Milano Boutique'],
                      ['phone', '电话 *', '+39 ...'],
                      ['contactPerson', '联系人', '负责人姓名'],
                      ['email', '联系邮箱', 'buyer@example.com'],
                      ['vatNumber', 'VAT / P.IVA', 'IT01234567890'],
                      ['address', '公司地址', '完整地址']
                    ].map(([key, label, placeholder]) => (
                      <label key={key} className={key === 'address' ? 'col-span-2 text-[11px] font-semibold text-neutral-600' : 'text-[11px] font-semibold text-neutral-600'}>
                        {label}
                        <input required={key === 'companyName' || key === 'phone'} value={customerForm[key as keyof typeof customerForm]} onChange={event => setCustomerForm(previous => ({ ...previous, [key]: event.target.value }))} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal outline-none focus:border-neutral-500" />
                      </label>
                    ))}
                    <label className="text-[11px] font-semibold text-neutral-600">国家
                      <select value={customerForm.country} onChange={event => setCustomerForm(previous => ({ ...previous, country: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal">
                        {['Italy', 'France', 'Germany', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'United Kingdom', 'Other'].map(country => <option key={country}>{country}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-neutral-600">城市
                      <select value={customerForm.city} onChange={event => setCustomerForm(previous => ({ ...previous, city: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal">
                        <option value="">选择城市（可选）</option>
                        {['Milano', 'Prato', 'Firenze', 'Roma', 'Torino', 'Bologna', 'Parigi', 'Lione', 'Berlino', 'Madrid', 'Lisboa', 'Amsterdam', '其他'].map(city => <option key={city}>{city}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-neutral-600">经营类型
                      <select value={customerForm.businessType} onChange={event => setCustomerForm(previous => ({ ...previous, businessType: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal">
                        <option>Boutique</option><option>Retail Store</option><option>Online Store</option><option>Department Store</option><option>Wholesale Buyer</option><option>Distributor</option><option>Brand</option><option>Stylist / Atelier</option><option>Other</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-neutral-600">客户等级
                      <select value={customerForm.customerLevel} onChange={event => setCustomerForm(previous => ({ ...previous, customerLevel: event.target.value as CustomerLevel }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal">
                        <option value="good_customer">好客户</option>
                        <option value="regular_customer">熟客户</option>
                        <option value="new_customer">新客户</option>
                        <option value="overdue_customer">欠钱客户</option>
                      </select>
                    </label>
                    <label className="col-span-2 text-[11px] font-semibold text-neutral-600">合作备注
                      <textarea value={customerForm.notes} onChange={event => setCustomerForm(previous => ({ ...previous, notes: event.target.value }))} maxLength={2000} placeholder="客户采购偏好、合作条件或跟进记录" className="mt-1 min-h-20 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-normal" />
                    </label>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-4">
                    <button type="submit" disabled={customerFormBusy} className="flex-1 rounded-lg bg-neutral-950 py-2.5 text-xs font-bold text-white disabled:opacity-50">{customerFormBusy ? '保存中...' : editingCustomerId ? '保存客户资料' : '保存客户档案'}</button>
                    <button type="button" onClick={() => { setShowCustomerForm(false); setEditingCustomerId(null); }} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-700">取消</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'store' && (
          currentMerchant
            ? <div className="-mx-4 -mt-2 animate-fadeIn"><MerchantStoreView embeddedInMerchantApp merchantId={currentMerchant.id} /></div>
            : <div className="rounded-3xl bg-white p-5 text-center text-[11px] text-neutral-500">{mobileText('当前没有可显示的商家网店。', 'Nessun negozio disponibile.')}</div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-5 text-white shadow-xl shadow-neutral-900/10">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
                  {currentMerchant?.logo ? (
                    <img
                      src={merchantMediaUrl(currentMerchant.logo, DEFAULT_MERCHANT_LOGO)}
                      alt={currentMerchant.name}
                      className="h-full w-full object-cover"
                      onError={event => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = DEFAULT_MERCHANT_LOGO;
                      }}
                    />
                  ) : (
                    <Building2 className="h-7 w-7 text-neutral-900" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-2xl font-black leading-tight sm:text-[26px]">{merchantProfileValue('name') || 'RUDA Merchant'}</p>
                  {merchantProfileValue('city') && (
                    <p className="text-[12px] text-white/60 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{merchantProfileValue('city')}, {merchantProfileValue('country') || 'IT'}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setMerchantProfileUnlocked(previous => !previous)} className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[10px] font-bold ${merchantProfileUnlocked ? 'bg-white text-neutral-900' : 'bg-white/10 text-white'}`}>
                  {merchantProfileUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {merchantProfileUnlocked ? mobileText('编辑中', 'Modifica') : mobileText('解锁资料', 'Sblocca')}
                </button>
              </div>
              {!merchantProfileUnlocked && (
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/10 pt-4 text-[10px]">
                  <p className="col-span-2 text-white/75">{merchantProfileValue('companyLegalName') || mobileText('尚未填写法定公司名', 'Ragione sociale non indicata')}</p>
                  {merchantProfileValue('contactPerson') && <p className="text-white/60">{merchantProfileValue('contactPerson')}</p>}
                  <p className="truncate text-white/60">{merchantProfileValue('contactPhone') || mobileText('未填写电话', 'Telefono non indicato')}</p>
                  <p className="col-span-2 truncate text-white/60">{merchantProfileValue('contactEmail') || mobileText('未填写邮箱', 'Email non indicata')}</p>
                  {merchantProfileValue('vatNumber') && <p className="col-span-2 text-white/60">VAT · {merchantProfileValue('vatNumber')}</p>}
                  <p className="col-span-2 text-white/60">{merchantProfileValue('showroomAddress') || mobileText('尚未填写展厅地址', 'Indirizzo showroom non indicato')}</p>
                </div>
              )}
              {merchantProfileUnlocked && (
                <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
                  {([
                    ['name', mobileText('店铺名称', 'Nome negozio')],
                    ['companyLegalName', mobileText('法定公司名', 'Ragione sociale')],
                    ['vatNumber', mobileText('VAT 税号', 'Partita IVA')],
                    ['contactPerson', mobileText('负责人', 'Referente')],
                    ['contactEmail', mobileText('联系邮箱', 'Email')],
                    ['contactPhone', mobileText('联系电话', 'Telefono')],
                    ['country', mobileText('国家', 'Paese')],
                    ['city', mobileText('城市', 'Città')],
                    ['showroomAddress', mobileText('展厅地址', 'Indirizzo showroom')]
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-[10px] font-semibold text-white/60">
                      {label}
                      <input value={merchantSettings[key]} onChange={event => setMerchantSettings(previous => ({ ...previous, [key]: event.target.value }))} className="mt-1 h-9 w-full rounded-xl border-0 bg-white/10 px-3 text-[12px] text-white outline-none placeholder:text-white/40 focus:bg-white/15" />
                    </label>
                  ))}
                  <button type="button" onClick={() => void saveMerchantSettings()} disabled={merchantSettingsBusy} className="h-10 w-full rounded-xl bg-white text-[11px] font-bold text-neutral-900 disabled:opacity-50">
                    {merchantSettingsBusy ? mobileText('保存中...', 'Salvando...') : mobileText('保存店铺资料', 'Salva profilo')}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
                <div className="text-center">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('30日成交', '30gg')}</span>
                  <span className="text-[16px] font-black">€{(operationsIntelligence?.summary.gmv30d || 0).toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('待发货', 'Spedire')}</span>
                  <span className="text-[16px] font-black text-amber-400">{operationsIntelligence?.summary.pendingFulfillment || 0}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] text-white/50 mb-0.5">{mobileText('低库存', 'Scorte')}</span>
                  <span className={`text-[16px] font-black ${operationsIntelligence?.summary.lowStockSkus ? 'text-rose-400' : 'text-emerald-400'}`}>{operationsIntelligence?.summary.lowStockSkus || 0}</span>
                </div>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-bold text-white">{mobileText('商务名片', 'Biglietto da visita')}</p>
                    <p className="mt-1 text-[10px] text-white/50">{mobileText('分享或下载当前店铺资料', 'Condividi o scarica il profilo')}</p>
                  </div>
                  <Share2 className="h-4 w-4 text-white/60" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" disabled={smartCardBusy} onClick={() => void shareSmartCard()} className="rounded-xl bg-white py-2.5 text-[10px] font-bold text-neutral-900 disabled:opacity-50"><Share2 className="mx-auto mb-1 h-4 w-4" />分享</button>
                  <button type="button" onClick={() => downloadSmartCard('vcf')} className="rounded-xl bg-white/10 py-2.5 text-[10px] font-bold text-white"><Download className="mx-auto mb-1 h-4 w-4" />联系人卡片</button>
                  <button type="button" onClick={() => downloadSmartCard('html')} className="rounded-xl bg-white/10 py-2.5 text-[10px] font-bold text-white"><Download className="mx-auto mb-1 h-4 w-4" />资料页</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button type="button" onClick={onSwitchToDesktop} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-neutral-700" />
                </div>
                <div>
                  <span className="block text-[12px] font-bold text-neutral-900">{mobileText('电脑版', 'Desktop')}</span>
                  <span className="mt-1 block text-[10px] text-neutral-500">{mobileText('切换到桌面端管理', 'Passa alla gestione desktop')}</span>
                </div>
              </button>
            </div>

            {settingsSection === null && (
            <div className="rounded-3xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[13px] font-bold text-neutral-900">{mobileText('设置中心', 'Impostazioni')}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-500">{mobileText('按业务模块管理 App 和店铺', 'Gestisci app e negozio per area')}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-bold text-neutral-500">PRO</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ['operations', mobileText('运营偏好', 'Operatività'), mobileText('提醒、显示、语言', 'Avvisi e lingua')],
                  ['store', mobileText('店铺运营规则', 'Regole negozio'), mobileText('MOQ、账期和发货', 'MOQ, termini e spedizione')],
                  ['finance', mobileText('收款与账期', 'Pagamenti'), mobileText('账户和付款条件', 'Conti e termini')],
                  ['team', mobileText('团队与安全', 'Team e sicurezza'), mobileText('员工和账户操作', 'Staff e accesso')]
                ] as const).map(([key, label, description]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSettingsSection(key)}
                    className={`rounded-2xl border p-3 text-left transition-colors ${settingsSection === key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-neutral-50 text-neutral-900'}`}
                  >
                    <span className="block text-[12px] font-bold">{label}</span>
                    <span className={`mt-1 block text-[10px] ${settingsSection === key ? 'text-white/60' : 'text-neutral-500'}`}>{description}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {settingsSection !== null && (
              <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <button type="button" onClick={() => setSettingsSection(null)} className="text-[11px] font-bold text-neutral-700">← 返回设置中心</button>
                <span className="text-[11px] font-bold text-neutral-400">
                  {settingsSection === 'operations' ? '运营偏好' : settingsSection === 'store' ? '店铺运营规则' : settingsSection === 'finance' ? '收款与账期' : '团队与安全'}
                </span>
              </div>
            )}

            {settingsSection === 'operations' && <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-neutral-50 flex items-center justify-between">
                <span className="text-[13px] font-bold text-neutral-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-700" />{mobileText('手机设置', 'Impostazioni')}
                </span>
              </div>
              {[
                { key: 'alerts' as const, label: mobileText('运营提醒', 'Notifiche'), enabled: mobileSettings.alerts },
                { key: 'sound' as const, label: mobileText('订单提示音', 'Suono ordini'), enabled: mobileSettings.sound },
                { key: 'compact' as const, label: mobileText('紧凑显示', 'Compatto'), enabled: mobileSettings.compact }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-50 last:border-b-0">
                  <span className="text-[13px] font-semibold text-neutral-800">{item.label}</span>
                  <button type="button" role="switch" aria-checked={item.enabled} onClick={() => updateMobileSetting(item.key, !item.enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${item.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
              <div className="px-4 py-3.5 border-b border-neutral-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] font-semibold text-neutral-600 mb-1">{mobileText('首页', 'Home')}</span>
                    <select value={merchantSettings.mobileDefaultTab} onChange={event => setMerchantSettings(previous => ({ ...previous, mobileDefaultTab: event.target.value }))} className="w-full h-9 rounded-xl bg-neutral-50 px-2.5 text-[11px] text-neutral-800 outline-none border-0">
                      <option value="dashboard">{mobileText('首页', 'Dashboard')}</option>
                      <option value="products">{mobileText('商品', 'Prodotti')}</option>
                      <option value="orders">{mobileText('订单', 'Ordini')}</option>
                      <option value="inventory">{mobileText('库存', 'Scorte')}</option>
                      <option value="customers">{mobileText('客户', 'Clienti')}</option>
                      <option value="store">{mobileText('网店', 'Negozio')}</option>
                      <option value="profile">{mobileText('我的', 'Profilo')}</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-neutral-600 mb-1">{mobileText('语言', 'Lingua')}</span>
                    <select value={languagePreference} onChange={event => {
                      const value = event.target.value;
                      if (value === 'auto') setAutoLanguage();
                      else if (isLanguage(value)) setLang(value);
                    }} className="w-full h-9 rounded-xl bg-neutral-50 px-2.5 text-[11px] text-neutral-800 outline-none border-0">
                      <option value="auto">{mobileText('跟随浏览器', 'Automatico · Browser')}</option>
                      {LANGUAGE_OPTIONS.map(({ code, nativeName }) => (
                        <option key={code} value={code}>{nativeName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3.5 border-b border-neutral-50">
                <p className="mb-2 text-[11px] font-bold text-neutral-600">{mobileText('业务通知', 'Avvisi operativi')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['notifyOrders', mobileText('新订单', 'Nuovi ordini')],
                    ['notifyPayouts', mobileText('收款到账', 'Pagamenti')],
                    ['notifyVault', mobileText('私密款申请', 'Richieste private')],
                    ['notifyMarketing', mobileText('营销消息', 'Marketing')]
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 text-[11px] font-semibold text-neutral-700">
                      <span>{label}</span>
                      <input type="checkbox" checked={merchantSettings[key]} onChange={event => setMerchantSettings(previous => ({ ...previous, [key]: event.target.checked }))} className="h-4 w-4 accent-neutral-900" />
                    </label>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3.5">
                <button type="button" onClick={() => void saveMerchantSettings()} disabled={merchantSettingsBusy} className="w-full h-10 rounded-2xl bg-neutral-900 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md shadow-neutral-900/10">
                  {merchantSettingsBusy ? mobileText('保存中...', 'Salvando...') : mobileText('保存设置', 'Salva')}
                </button>
              </div>
            </div>}

            {settingsSection === 'finance' && <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-neutral-50 flex items-center justify-between">
                <span className="text-[13px] font-bold text-neutral-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-neutral-700" />{mobileText('收款与结算', 'Pagamenti e incassi')}
                </span>
              </div>
              <div className="px-4 py-4">
                {financeSummary && (
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-neutral-50 p-2.5"><span className="block text-[9px] text-neutral-500">{mobileText('总交易', 'Lordo')}</span><strong className="mt-1 block text-[12px]">€{financeSummary.totalGross.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong></div>
                    <div className="rounded-xl bg-neutral-50 p-2.5"><span className="block text-[9px] text-neutral-500">{mobileText('费用', 'Commissioni')}</span><strong className="mt-1 block text-[12px]">€{financeSummary.totalFees.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong></div>
                    <div className="rounded-xl bg-emerald-50 p-2.5"><span className="block text-[9px] text-emerald-700">{mobileText('净结算', 'Netto')}</span><strong className="mt-1 block text-[12px] text-emerald-800">€{financeSummary.totalNet.toLocaleString(getIntlLocale(lang), { maximumFractionDigits: 0 })}</strong></div>
                  </div>
                )}
                <p className="mb-3 text-[10px] leading-relaxed text-neutral-500">{mobileText('IBAN 会加密保存，页面只显示脱敏号码。新增或更换收款账户需由平台财务审核。', 'L’IBAN è cifrato e mostrato solo in forma mascherata. Ogni nuovo conto richiede la verifica finanziaria.')}</p>
                {mobileBankAccounts.length === 0 ? (
                  <p className="rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-700">{mobileText('尚未提交收款账户', 'IBAN non configurato')}</p>
                ) : mobileBankAccounts.map(account => (
                  <div key={account.id} className="mb-2 rounded-2xl bg-neutral-50 p-3 last:mb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0"><span className="block truncate text-[11px] font-semibold text-neutral-700">{account.accountHolder}</span><span className="mt-0.5 block font-mono text-[10px] text-neutral-500">{account.iban}</span></div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${account.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : account.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {account.status === 'verified' ? mobileText('已核验', 'Verificato') : account.status === 'rejected' ? mobileText('需更新', 'Da aggiornare') : mobileText('审核中', 'In verifica')}
                      </span>
                    </div>
                    {account.status === 'rejected' && account.rejectionReason && <p className="mt-2 text-[10px] text-rose-700">{account.rejectionReason}</p>}
                  </div>
                ))}
                <form onSubmit={submitBankAccount} className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                  <p className="text-[11px] font-bold text-neutral-700">{mobileText('添加收款账户', 'Aggiungi conto')}</p>
                  <input required minLength={2} maxLength={160} value={bankAccountForm.accountHolder} onChange={event => setBankAccountForm(previous => ({ ...previous, accountHolder: event.target.value }))} placeholder={mobileText('账户持有人（法定主体）', 'Intestatario del conto')} className="h-10 w-full rounded-xl bg-neutral-50 px-3 text-[11px] outline-none focus:ring-2 focus:ring-neutral-900/10" />
                  <input required autoComplete="off" value={bankAccountForm.iban} onChange={event => setBankAccountForm(previous => ({ ...previous, iban: event.target.value.toUpperCase() }))} placeholder="IBAN" className="h-10 w-full rounded-xl bg-neutral-50 px-3 font-mono text-[11px] uppercase outline-none focus:ring-2 focus:ring-neutral-900/10" />
                  <button type="submit" disabled={bankAccountBusy} className="h-10 w-full rounded-xl bg-neutral-900 text-[11px] font-bold text-white disabled:opacity-50">{bankAccountBusy ? mobileText('提交中...', 'Invio...') : mobileText('提交审核', 'Invia per verifica')}</button>
                </form>
              </div>
            </div>}

            {settingsSection === 'store' && <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-neutral-50 flex items-center justify-between">
                <span className="text-[13px] font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-700" />{mobileText('店铺运营规则', 'Regole negozio')}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-500 mb-1">MOQ</label>
                    <input type="number" min="1" max="100000" value={merchantSettings.moq} onChange={event => setMerchantSettings(previous => ({ ...previous, moq: Number(event.target.value) }))} className="w-full h-10 rounded-xl bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none border-0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('账期', 'Termini')}</label>
                    <select value={merchantSettings.defaultPaymentTerm} onChange={event => setMerchantSettings(previous => ({ ...previous, defaultPaymentTerm: event.target.value }))} className="w-full h-10 rounded-xl bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none border-0">
                      <option value="prepaid">{mobileText('预付', 'Prepagato')}</option>
                      <option value="net_15">Net 15</option>
                      <option value="net_30">Net 30</option>
                      <option value="net_60">Net 60</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('发货说明', 'Note di spedizione')}</label>
                  <textarea value={merchantSettings.shippingNote} onChange={event => setMerchantSettings(previous => ({ ...previous, shippingNote: event.target.value }))} rows={3} maxLength={500} placeholder={mobileText('例如：订单确认后 2–3 个工作日内发货', 'Tempi e condizioni di spedizione')} className="w-full resize-none rounded-xl bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-800 outline-none border-0 focus:ring-2 focus:ring-neutral-900/5" />
                </div>
                <button type="button" onClick={() => void saveMerchantSettings()} disabled={merchantSettingsBusy} className="w-full h-10 rounded-2xl bg-neutral-900 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-1">
                  {mobileText('保存店铺', 'Salva negozio')}
                </button>
              </div>
            </div>}

            {settingsSection === 'team' && <div className="space-y-3">
              <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-neutral-900"><Users className="h-4 w-4" />{mobileText('员工账号管理', 'Gestione dipendenti')}</span>
                  <button type="button" onClick={() => void refreshTeamSettings()} disabled={teamLoading} className="text-[10px] font-semibold text-neutral-500 disabled:opacity-50">{teamLoading ? mobileText('同步中...', 'Aggiornamento...') : mobileText('刷新', 'Aggiorna')}</button>
                </div>
                {teamLoadError ? <div className="p-4 text-[11px] text-rose-700">{mobileText('无法读取团队数据：', 'Impossibile caricare il team:')}{teamLoadError}</div> : (
                  <div className="divide-y divide-neutral-100">
                    {teamLoading && teamEmployees.length === 0 ? <p className="p-4 text-[11px] text-neutral-500">{mobileText('正在加载员工...', 'Caricamento dipendenti...')}</p> : null}
                    {!teamLoading && teamEmployees.length === 0 ? <p className="p-4 text-[11px] text-neutral-500">{mobileText('暂无员工账号。创建员工后，可在员工 App 中调整其具体权限。', 'Nessun dipendente. Crea un account e configura i permessi nell’app dipendenti.')}</p> : null}
                    {teamEmployees.map(employee => (
                      <div key={employee.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-neutral-800">{employee.name}</p>
                          <p className="truncate text-[10px] text-neutral-500">{employee.email} · {employee.role}</p>
                          <p className="mt-0.5 text-[9px] text-neutral-400">{employee.lastLoginAt ? `${mobileText('最近登录', 'Ultimo accesso')} ${new Date(employee.lastLoginAt).toLocaleDateString()}` : mobileText('尚未登录', 'Mai effettuato l’accesso')}</p>
                        </div>
                        <button type="button" onClick={() => void setTeamEmployeeActive(employee)} disabled={teamBusyId === employee.id} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 ${employee.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          {teamBusyId === employee.id ? mobileText('处理中', 'Attendere') : employee.active ? mobileText('启用中 · 停用', 'Attivo · Disattiva') : mobileText('已停用 · 启用', 'Disattivo · Attiva')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <a href="/employee" className="flex items-center justify-between border-t border-neutral-100 px-4 py-3.5 text-[11px] font-semibold text-neutral-700 active:bg-neutral-50">
                  {mobileText('打开员工端设置权限', 'Configura permessi dipendenti')}<ChevronRight className="h-4 w-4 text-neutral-400" />
                </a>
              </div>

              <form onSubmit={createTeamEmployee} className="space-y-2 rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-[12px] font-bold text-neutral-900">{mobileText('创建员工账号', 'Crea account dipendente')}</h3>
                <input required maxLength={100} value={employeeForm.name} onChange={event => setEmployeeForm(previous => ({ ...previous, name: event.target.value }))} placeholder={mobileText('员工姓名', 'Nome dipendente')} className="h-10 w-full rounded-xl bg-neutral-50 px-3 text-[11px] outline-none focus:ring-2 focus:ring-neutral-900/10" />
                <input required type="email" maxLength={160} autoComplete="email" value={employeeForm.email} onChange={event => setEmployeeForm(previous => ({ ...previous, email: event.target.value }))} placeholder={mobileText('员工邮箱', 'Email dipendente')} className="h-10 w-full rounded-xl bg-neutral-50 px-3 text-[11px] outline-none focus:ring-2 focus:ring-neutral-900/10" />
                <PasswordInput required minLength={8} autoComplete="new-password" value={employeeForm.password} onChange={event => setEmployeeForm(previous => ({ ...previous, password: event.target.value }))} placeholder={mobileText('初始密码（至少 8 位）', 'Password iniziale (min. 8 caratteri)')} className="h-10 w-full rounded-xl bg-neutral-50 px-3 pr-10 text-[11px] outline-none focus:ring-2 focus:ring-neutral-900/10" />
                <select value={employeeForm.role} onChange={event => setEmployeeForm(previous => ({ ...previous, role: event.target.value as MobileEmployee['role'] }))} className="h-10 w-full rounded-xl bg-neutral-50 px-3 text-[11px] outline-none">
                  <option value="sales">{mobileText('销售', 'Vendite')}</option><option value="warehouse">{mobileText('仓库', 'Magazzino')}</option><option value="production">{mobileText('生产', 'Produzione')}</option><option value="pos_cashier">{mobileText('POS 收银', 'Cassa POS')}</option><option value="store_manager">{mobileText('店铺经理', 'Responsabile negozio')}</option>
                </select>
                <button type="submit" disabled={employeeCreateBusy} className="h-10 w-full rounded-xl bg-neutral-900 text-[11px] font-bold text-white disabled:opacity-50">{employeeCreateBusy ? mobileText('创建中...', 'Creazione...') : mobileText('创建员工账号', 'Crea account')}</button>
                <p className="text-[9px] leading-relaxed text-neutral-400">{mobileText('员工初始密码请安全告知本人。账号停用后将无法登录；员工权限可在员工端管理。', 'Comunica la password iniziale in modo sicuro. Gli account disattivati non possono accedere.')}</p>
              </form>

              <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="border-b border-neutral-100 px-4 py-3.5 text-[12px] font-bold text-neutral-900">{mobileText('最近安全操作', 'Attività recenti')}</div>
                {teamAudit.length === 0 ? <p className="p-4 text-[10px] text-neutral-500">{mobileText('暂无可显示的操作记录', 'Nessuna attività recente')}</p> : teamAudit.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center justify-between gap-3 border-b border-neutral-50 px-4 py-2.5 last:border-b-0">
                    <div className="min-w-0"><p className="truncate text-[10px] font-semibold text-neutral-700">{log.action.replaceAll('_', ' ')}</p><p className="text-[9px] text-neutral-400">{log.entityType}{log.entityId ? ` · ${log.entityId}` : ''}</p></div>
                    <time className="shrink-0 text-[9px] text-neutral-400">{new Date(log.createdAt).toLocaleString()}</time>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => { logout(); }} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-rose-50 transition-colors">
                <span className="flex items-center gap-3 text-[13px] font-bold text-rose-600">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><LogOut className="w-4 h-4 text-rose-600" /></div>
                  {mobileText('退出账户', 'Esci')}
                </span>
                <ChevronRight className="w-4 h-4 text-rose-300" />
              </button>
            </div>}
          </div>
        )}
      </div>

      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedOrderDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-slideUp" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl px-5 pt-5 pb-4 border-b border-neutral-100 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] font-black text-neutral-500 tracking-wide">{selectedOrderDetail.orderNo}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      selectedOrderDetail.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                      selectedOrderDetail.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                      selectedOrderDetail.status === 'cancelled' ? 'bg-neutral-100 text-neutral-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {selectedOrderDetail.status === 'delivered' ? mobileText('已签收', 'Consegnato') : selectedOrderDetail.status === 'shipped' ? mobileText('已发货', 'Spedito') : selectedOrderDetail.status === 'cancelled' ? mobileText('已取消', 'Cancellato') : mobileText('进行中', 'Attivo')}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[17px] font-black text-neutral-900 leading-tight truncate">{selectedOrderDetail.companyName}</h3>
                  <p className="mt-0.5 text-[11px] text-neutral-500">{selectedOrderDetail.date || '—'} · {selectedOrderDetail.deliveryType === 'showroom_pickup' ? mobileText('展厅自提', 'Ritiro') : mobileText('物流配送', 'Spedizione')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => orderEditUnlocked ? void saveOrderEdit() : startOrderEdit(selectedOrderDetail)} disabled={orderEditBusy} className={`flex h-9 items-center gap-1 rounded-2xl px-3 text-[10px] font-bold disabled:opacity-50 ${orderEditUnlocked ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                    <Unlock className="h-3.5 w-3.5" />{orderEditBusy ? '保存中' : orderEditUnlocked ? '保存更正' : '解锁编辑'}
                  </button>
                  <button type="button" onClick={() => { setSelectedOrderDetail(null); setOrderEditDraft(null); setOrderEditUnlocked(false); }} className="w-9 h-9 -mr-1 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 active:scale-95 transition-transform"><X className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {orderEditUnlocked && orderEditDraft && (
                <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-black text-neutral-900"><Unlock className="h-3.5 w-3.5" />订单更正模式</span>
                    <button type="button" onClick={() => { setOrderEditDraft(null); setOrderEditUnlocked(false); }} className="text-[10px] font-bold text-neutral-500">取消</button>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <label className="block text-[10px] font-semibold text-neutral-500">客户公司<input value={orderEditDraft.companyName} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, companyName: event.target.value } : previous)} className="mt-1 h-10 w-full rounded-xl bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none" /></label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-[10px] font-semibold text-neutral-500">交付方式<select value={orderEditDraft.deliveryType} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, deliveryType: event.target.value as Order['deliveryType'] } : previous)} className="mt-1 h-10 w-full rounded-xl bg-neutral-50 px-2 text-[11px] text-neutral-800 outline-none"><option value="shipping">物流配送</option><option value="showroom_pickup">展厅自提</option></select></label>
                      <label className="block text-[10px] font-semibold text-neutral-500">付款方式<select value={orderEditDraft.paymentMethod} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, paymentMethod: event.target.value as Order['paymentMethod'] } : previous)} className="mt-1 h-10 w-full rounded-xl bg-neutral-50 px-2 text-[11px] text-neutral-800 outline-none"><option value="bank_transfer">银行转账</option><option value="net_30">Net 30</option><option value="credit_card">信用卡</option></select></label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['street', 'city', 'country', 'zip'] as const).map(key => <label key={key} className="block text-[10px] font-semibold text-neutral-500">{key === 'street' ? '地址' : key === 'zip' ? '邮编' : key === 'city' ? '城市' : '国家'}<input value={orderEditDraft.shippingAddress[key]} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, shippingAddress: { ...previous.shippingAddress, [key]: event.target.value } } : previous)} className="mt-1 h-10 w-full rounded-xl bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none" /></label>)}
                    </div>
                    <label className="block text-[10px] font-semibold text-neutral-500">订单备注<textarea value={orderEditDraft.notes || ''} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, notes: event.target.value } : previous)} rows={2} className="mt-1 w-full resize-none rounded-xl bg-neutral-50 px-3 py-2 text-[12px] text-neutral-800 outline-none" /></label>
                    <div className="border-t border-neutral-100 pt-2">
                      <p className="mb-2 text-[10px] font-bold text-neutral-600">商品数量和单价</p>
                      {orderEditDraft.items.map((item, index) => <div key={item.id} className="mb-2 grid grid-cols-[1fr_68px_78px] items-center gap-2"><span className="truncate text-[10px] text-neutral-700">{item.styleNo} · {item.sku}</span><input type="number" min={item.packSize || 1} step={item.packSize || 1} value={item.quantity} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, items: previous.items.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: Number(event.target.value) } : current) } : previous)} className="h-9 rounded-lg bg-neutral-50 px-2 text-[11px] outline-none" /><input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={event => setOrderEditDraft(previous => previous ? { ...previous, items: previous.items.map((current, itemIndex) => itemIndex === index ? { ...current, unitPrice: Number(event.target.value) } : current) } : previous)} className="h-9 rounded-lg bg-neutral-50 px-2 text-[11px] outline-none" /></div>)}
                    </div>
                  </div>
                  <p className="mt-2 text-[9px] text-neutral-500">仅可在订单确认前更正；数量需符合商品起订量和箱规，发货后自动锁定。</p>
                </div>
              )}
              <div className="rounded-3xl border border-neutral-100 bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-neutral-800"><FileText className="h-3.5 w-3.5" />订单单据中心</span>
                  <span className="text-[10px] text-neutral-500">开票 · 打单 · 发送</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openOrderDocument(selectedOrderDetail, 'invoice')} className="rounded-xl bg-white py-2.5 text-[10px] font-bold text-neutral-800"><Printer className="mx-auto mb-1 h-4 w-4" />发票</button>
                  <button type="button" onClick={() => openOrderDocument(selectedOrderDetail, 'picking')} className="rounded-xl bg-white py-2.5 text-[10px] font-bold text-neutral-800"><FileText className="mx-auto mb-1 h-4 w-4" />拣货单</button>
                  <button type="button" onClick={() => openOrderDocument(selectedOrderDetail, 'packing')} className="rounded-xl bg-white py-2.5 text-[10px] font-bold text-neutral-800"><FileText className="mx-auto mb-1 h-4 w-4" />装箱单</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={orderDocumentBusy} onClick={() => void shareOrderDocument(selectedOrderDetail)} className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2.5 text-[10px] font-bold text-white disabled:opacity-50"><Share2 className="h-3.5 w-3.5" />分享 / 保存链接</button>
                  <button type="button" disabled={orderDocumentBusy} onClick={() => void sendOrderDocument(selectedOrderDetail)} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-[10px] font-bold text-neutral-800 disabled:opacity-50"><Bell className="h-3.5 w-3.5" />发送给客户</button>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[9px] text-neutral-500"><Volume2 className="h-3 w-3" />订单数量变化时自动提醒并播放提示音</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('订单金额', 'Totale')}</span><strong className="text-[20px] font-black text-neutral-900">€{selectedOrderDetail.totalAmount.toFixed(2)}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('商品数量', 'Pezzi')}</span><strong className="text-[20px] font-black text-neutral-900">{selectedOrderDetail.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('付款', 'Pagamento')}</span><strong className={`text-[13px] font-bold ${selectedOrderDetail.paymentStatus === 'paid' ? 'text-emerald-600' : selectedOrderDetail.paymentStatus === 'refunded' ? 'text-rose-600' : 'text-amber-600'}`}>{selectedOrderDetail.paymentStatus === 'paid' ? mobileText('已付款', 'Pagato') : selectedOrderDetail.paymentStatus === 'pending_credit' ? mobileText('账期', 'Fido') : selectedOrderDetail.paymentStatus === 'refunded' ? mobileText('退款', 'Rimborso') : mobileText('待付', 'Attesa')}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('SKU数', 'SKU')}</span><strong className="text-[20px] font-black text-neutral-900">{selectedOrderDetail.items.length}</strong></div>
              </div>
              <div className="rounded-3xl border border-neutral-100 bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-neutral-800"><Sparkles className="h-3.5 w-3.5" /> 智能商品诊断</span>
                  <span className="text-[11px] font-black text-neutral-900">{productQualityScore}% 完整度</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${productQualityScore}%` }} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-xl bg-white p-2.5"><span className="block text-neutral-400">价格毛利</span><strong className="mt-1 block text-neutral-900">{productMargin === null ? '待补充价格' : `${productMargin}%`}</strong></div>
                  <div className="rounded-xl bg-white p-2.5"><span className="block text-neutral-400">库存信号</span><strong className="mt-1 block text-neutral-900">{selectedProduct.inventoryStatus === 'low_stock' ? '需要补货' : selectedProduct.inventoryStatus === 'pre_order' ? '预售管理' : '库存正常'}</strong></div>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-100 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-[12px] font-black text-neutral-800">{mobileText('商品明细', 'Articoli')}</span>
                </div>
                <div className="divide-y divide-neutral-50">
                  {selectedOrderDetail.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-neutral-900 truncate">{item.styleNo}</div>
                        <div className="text-[10px] text-neutral-500 truncate mt-0.5">{item.color || '-'} / {item.size || '-'} <span className="text-neutral-300">·</span> <span className="font-mono">{item.sku}</span></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-black text-neutral-900">×{item.quantity}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">€{(item.quantity * item.unitPrice).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrderDetail.shippingAddress && (
                <div className="rounded-3xl border border-neutral-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-blue-600" /></div>
                    <span className="text-[12px] font-black text-neutral-800">{mobileText('收货地址', 'Indirizzo')}</span>
                  </div>
                  <div className="text-[12px] text-neutral-600 leading-relaxed ml-9">{selectedOrderDetail.shippingAddress.street}, {selectedOrderDetail.shippingAddress.city}, {selectedOrderDetail.shippingAddress.country} {selectedOrderDetail.shippingAddress.zip}</div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl px-5 py-4 border-t border-neutral-100">
              <div className="flex gap-2.5">
                {['placed', 'pending', 'confirmed', 'picking'].includes(selectedOrderDetail.status) && (
                  <button type="button" onClick={() => { setSelectedOrderToFulfill(selectedOrderDetail.id); setSelectedOrderDetail(null); }} className="flex-1 h-11 rounded-2xl bg-neutral-900 text-white text-[13px] font-black shadow-lg shadow-neutral-900/15 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    {selectedOrderDetail.status === 'picking' ? mobileText('确认发货', 'Spedisci') : selectedOrderDetail.status === 'confirmed' ? mobileText('开始配货', 'Prepara') : mobileText('确认订单', 'Conferma')}
                  </button>
                )}
                <button type="button" onClick={() => setSelectedOrderDetail(null)} className="h-11 px-5 rounded-2xl bg-neutral-100 text-neutral-700 text-[13px] font-bold active:scale-[0.98] transition-transform">{mobileText('关闭', 'Chiudi')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewProductDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowNewProductDialog(false)}>
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-slideUp p-6" onClick={event => event.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-black text-neutral-900 leading-tight">{mobileText('添加商品', 'Nuovo prodotto')}</h3>
                <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                  {mobileText('在 App 内拍照、上传并创建商品', 'Crea il prodotto direttamente nell’app')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-neutral-50 p-3 text-center">
                <Boxes className="w-5 h-5 text-neutral-700 mx-auto mb-1.5" />
                <span className="block text-[9px] font-bold text-neutral-800">{mobileText('规格矩阵', 'Matrix SKU')}</span>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-3 text-center">
                <Layers className="w-5 h-5 text-neutral-700 mx-auto mb-1.5" />
                <span className="block text-[9px] font-bold text-neutral-800">{mobileText('多图上传', 'Immagini')}</span>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-3 text-center">
                <ArrowRightLeft className="w-5 h-5 text-neutral-700 mx-auto mb-1.5" />
                <span className="block text-[9px] font-bold text-neutral-800">{mobileText('批量导入', 'Importa CSV')}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowNewProductDialog(false);
                  setProductDraft({
                    name: '',
                    category: '',
                    subCategory: '',
                    brand: currentMerchant?.name || '',
                    wholesalePrice: 0,
                    rrpPrice: 0,
                    moq: 1,
                    packSize: 1,
                    images: [],
                    media: [],
                    visibility: 'public',
                    description: '',
                    fabric: ''
                  });
                }}
                className="flex-1 h-11 rounded-2xl bg-neutral-900 text-white text-[13px] font-black shadow-lg shadow-neutral-900/15 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {mobileText('在 App 里创建', 'Crea nell’app')}
              </button>
              <button
                type="button"
                onClick={() => setShowNewProductDialog(false)}
                className="h-11 px-5 rounded-2xl bg-neutral-100 text-neutral-700 text-[13px] font-bold active:scale-[0.98] transition-transform"
              >
                {mobileText('稍后', 'Dopo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {productDraft && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" onClick={() => !productDraftBusy && setProductDraft(null)}>
          <form
            className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
            onSubmit={event => { event.preventDefault(); void saveProductDraft(); }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">🔓 商品编辑</p>
                <h3 className="mt-1 text-lg font-black text-neutral-900">编辑全部商品资料</h3>
              </div>
              <button type="button" onClick={runProductSmartAssistant} disabled={productSmartBusy} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-3 text-xs font-black text-white disabled:opacity-50">
                <Sparkles className="h-3.5 w-3.5" /> {productSmartBusy ? '智能分析中...' : '✨ AI 智能补全与诊断'}
              </button>
              {productSmartAdvice.length > 0 && (
                <div className="space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-700">
                  {productSmartAdvice.map(advice => <p key={advice}>· {advice}</p>)}
                </div>
              )}
              <button type="button" disabled={productDraftBusy} onClick={() => setProductDraft(null)} className="rounded-full bg-neutral-100 p-2 text-neutral-500"><X className="h-4 w-4" /></button>
            </div>
            {([
              ['styleNo', '款号'],
              ['name', '商品名称'],
              ['category', '商品分类'],
              ['subCategory', '子分类'],
              ['brand', '品牌'],
              ['fabric', '面料材质']
            ] as const).map(([key, label]) => (
              <label key={key} className="block text-xs font-bold text-neutral-600">
                {label}
                <input
                  value={String(productDraft[key] ?? '')}
                  onChange={event => setProductDraft(previous => previous ? { ...previous, [key]: event.target.value } : previous)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-neutral-900"
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {([
                ['wholesalePrice', '批发价 (€)'],
                ['rrpPrice', '建议零售价 (€)'],
                ['moq', 'MOQ'],
                ['packSize', '箱规']
              ] as const).map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-neutral-600">
                  {label}
                  <input
                    type="number"
                    min="0"
                    step={key === 'wholesalePrice' || key === 'rrpPrice' ? '0.01' : '1'}
                    value={String(productDraft[key] ?? '')}
                    onChange={event => setProductDraft(previous => previous ? { ...previous, [key]: Number(event.target.value) } : previous)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-neutral-900"
                  />
                </label>
              ))}
            </div>
            <label className="block text-xs font-bold text-neutral-600">
              商品展示区
            <select value={getProductZone(productDraft)} onChange={event => setProductDraft(previous => previous ? { ...previous, ...getProductZoneUpdates(event.target.value as ProductZone) } : previous)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-neutral-900">
              <option value="new">新款区</option>
              <option value="clearance">特价区（倒货）</option>
                <option value="private">授权订货区</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-neutral-600">
              商品描述
              <textarea rows={4} value={String(productDraft.description ?? '')} onChange={event => setProductDraft(previous => previous ? { ...previous, description: event.target.value } : previous)} className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-neutral-900" />
            </label>
            <SmartMediaUploader
              value={(productDraft.media as Product['media']) || []}
              maxItems={12}
              capture
              onChange={media => setProductDraft(previous => previous ? { ...previous, media, images: media.filter(item => item.type === 'image').map(item => item.url) } : previous)}
            />
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={productDraftBusy} className="flex-1 rounded-xl bg-neutral-900 py-3 text-xs font-black text-white disabled:opacity-50">{productDraftBusy ? '保存中...' : '保存全部修改'}</button>
              <button type="button" disabled={productDraftBusy} onClick={() => setProductDraft(null)} className="rounded-xl bg-neutral-100 px-4 py-3 text-xs font-bold text-neutral-700">取消</button>
            </div>
          </form>
        </div>
      )}

      {reportingWorkOrder && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-2xs sm:items-center" onClick={() => setReportingWorkOrder(null)}>
          <form onSubmit={submitProductionReport} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-xs font-bold text-neutral-500">{reportingWorkOrder.workOrderNo}</p><h3 className="mt-1 text-base font-bold text-neutral-900">生产报产 / 质检</h3><p className="mt-1 text-[11px] text-neutral-500">{reportingWorkOrder.product.styleNo} · {reportingWorkOrder.variant.sku} · 计划 {reportingWorkOrder.plannedQuantity} 件</p></div>
              <button type="button" onClick={() => setReportingWorkOrder(null)} className="rounded-full bg-neutral-100 p-2 text-neutral-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-neutral-600">本次合格数量 *
                <input required type="number" min="0" value={reportForm.goodQuantity} onChange={event => setReportForm(previous => ({ ...previous, goodQuantity: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-semibold text-neutral-600">本次不合格数量
                <input type="number" min="0" value={reportForm.rejectedQuantity} onChange={event => setReportForm(previous => ({ ...previous, rejectedQuantity: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" />
              </label>
            </div>
            <label className="block text-xs font-semibold text-neutral-600">质检备注
              <textarea value={reportForm.note} onChange={event => setReportForm(previous => ({ ...previous, note: event.target.value }))} maxLength={2000} placeholder="记录批次、瑕疵原因或车间备注" className="mt-1 min-h-20 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs" />
            </label>
            <div className="rounded-lg bg-amber-50 p-2.5 text-[10px] leading-4 text-amber-800">合格数量提交后会自动进入成品库存；不合格数量会进入工单质检记录，不能重复报产。</div>
            <div className="flex gap-2"><button type="submit" disabled={reportBusy} className="flex-1 rounded-lg bg-neutral-950 py-2.5 text-xs font-bold text-white disabled:opacity-50">{reportBusy ? '提交中...' : '确认报产入库'}</button><button type="button" onClick={() => setReportingWorkOrder(null)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-700">取消</button></div>
          </form>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedProduct(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-slideUp" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl px-5 pt-5 pb-4 border-b border-neutral-100 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-[11px] font-black text-neutral-500 tracking-wide">{selectedProduct.styleNo}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      (selectedProduct.lifecycleStatus || 'published') === 'published' ? 'bg-emerald-50 text-emerald-700' :
                      selectedProduct.lifecycleStatus === 'draft' ? 'bg-neutral-100 text-neutral-600' :
                      selectedProduct.lifecycleStatus === 'archived' ? 'bg-neutral-100 text-neutral-500' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {(selectedProduct.lifecycleStatus || 'published') === 'published' ? mobileText('上架', 'Online') : selectedProduct.lifecycleStatus === 'draft' ? mobileText('草稿', 'Bozza') : selectedProduct.lifecycleStatus === 'archived' ? mobileText('归档', 'Archiviato') : mobileText('审核', 'Revisione')}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      selectedProduct.inventoryStatus === 'low_stock' ? 'bg-rose-50 text-rose-700' :
                      selectedProduct.inventoryStatus === 'pre_order' ? 'bg-amber-50 text-amber-700' :
                      selectedProduct.inventoryStatus === 'coming_soon' ? 'bg-blue-50 text-blue-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {selectedProduct.inventoryStatus === 'low_stock' ? mobileText('低库存', 'Poca scorta') : selectedProduct.inventoryStatus === 'pre_order' ? mobileText('预售', 'Preordine') : selectedProduct.inventoryStatus === 'coming_soon' ? mobileText('新品', 'Nuovo') : mobileText('有库存', 'Disponibile')}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[16px] font-black text-neutral-900 leading-tight line-clamp-2">{selectedProduct.name}</h3>
                  <p className="mt-0.5 text-[11px] text-neutral-500">{selectedProduct.brand || selectedProduct.category} · {selectedProduct.subCategory || '-'}</p>
                </div>
                <button type="button" onClick={() => setSelectedProduct(null)} className="w-9 h-9 -mr-1 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 active:scale-95 transition-transform"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-100 to-neutral-50">
                <ProductImage src={selectedProduct.images[0]} alt={selectedProduct.name} contain className="h-56 w-full" />
                {selectedProduct.visibility === 'private' && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-violet-600/95 backdrop-blur-sm text-white text-[10px] font-black">
                    <Lock className="w-3 h-3 inline mr-1" />{mobileText('授权订货区', 'Ordini autorizzati')}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('批发价', 'Ingrosso')}</span><strong className="text-[19px] font-black text-neutral-900">€{selectedProduct.wholesalePrice.toFixed(2)}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">{mobileText('零售价', 'Retail')}</span><strong className="text-[19px] font-black text-neutral-600">€{selectedProduct.rrpPrice.toFixed(2)}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">MOQ / {mobileText('箱规', 'Cartone')}</span><strong className="text-[15px] font-black text-neutral-900">{selectedProduct.moq} / {selectedProduct.packSize}</strong></div>
                <div className="rounded-2xl bg-neutral-50 p-3.5"><span className="block text-[10px] font-semibold text-neutral-500 mb-1">SKU</span><strong className="text-[19px] font-black text-neutral-900">{selectedProduct.skus.length}</strong></div>
              </div>

              <div className="rounded-3xl border border-neutral-100 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-[12px] font-black text-neutral-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {mobileText('商品管理', 'Gestione')}
                  </span>
                  {productBusyId === selectedProduct.id && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{mobileText('同步中', 'Salvando')}</span>}
                </div>
                <div className="px-4 py-2.5 border-b border-neutral-50">
                  {productEditUnlocked && (
                    <button type="button" onClick={() => openProductEditor(selectedProduct)} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2.5 text-[11px] font-black text-white">
                      <Pencil className="h-3.5 w-3.5" /> 编辑全部商品资料
                    </button>
                  )}
                  <span className="block text-[10px] font-semibold text-neutral-500 mb-1.5">{mobileText('商品展示区', 'Zona prodotto')}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'new', label: mobileText('新款区', 'Nuovi arrivi'), icon: <Globe className="w-3.5 h-3.5" /> },
                      { value: 'clearance', label: mobileText('特价区（倒货）', 'Offerte (stock)'), icon: <Users className="w-3.5 h-3.5" /> },
                      { value: 'private', label: mobileText('授权订货区', 'Ordini autorizzati'), icon: <Lock className="w-3.5 h-3.5" /> }
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!productEditUnlocked || productBusyId === selectedProduct.id}
                        onClick={() => void updateProductZone(selectedProduct, opt.value)}
                        className={`h-10 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                          getProductZone(selectedProduct) === opt.value
                            ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/15'
                            : 'bg-neutral-100 text-neutral-600 active:scale-[0.97]'
                        } disabled:opacity-50`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  { key: 'published' as const, label: mobileText('上架销售', 'In vendita'), enabled: (selectedProduct.lifecycleStatus || 'published') === 'published' }
                ].map(setting => (
                  <div key={setting.key} className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[13px] font-bold text-neutral-800">{setting.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={setting.enabled}
                      disabled={!productEditUnlocked || productBusyId === selectedProduct.id}
                      onClick={() => void toggleProductSetting(selectedProduct, setting.key, !setting.enabled)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${setting.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${setting.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
                <p className="px-4 pb-3 text-[10px] leading-4 text-neutral-500">{mobileText('开启上架后，这件商品会同时显示在商家网店和买手端本店页面。', 'Pubblicando il prodotto, sarà visibile sia nel negozio del commerciante sia nella vetrina buyer.')}</p>
              </div>

              <div className="rounded-3xl border border-neutral-100 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-[12px] font-black text-neutral-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    {mobileText('库存明细', 'Scorte SKU')}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400">{selectedProduct.skus.length} {mobileText('个规格', 'Varianti')}</span>
                </div>
                <div className="divide-y divide-neutral-50 max-h-64 overflow-y-auto">
                  {selectedProduct.skus.slice(0, 12).map(sku => {
                    const total = sku.stockCentral;
                    return (
                      <div key={sku.sku} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${total <= 3 ? 'bg-rose-50' : 'bg-neutral-100'}`}>
                            <Package className={`w-3.5 h-3.5 ${total <= 3 ? 'text-rose-600' : 'text-neutral-500'}`} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-neutral-800">{sku.color || '-'} / {sku.size || '-'}</div>
                            <div className="font-mono text-[9px] text-neutral-400 tracking-wide">{sku.sku}</div>
                          </div>
                        </div>
                        <strong className={`text-[14px] font-black ${total <= 3 ? 'text-rose-600' : 'text-neutral-900'}`}>{total}</strong>
                      </div>
                    );
                  })}
                  {selectedProduct.skus.length > 12 && <div className="px-4 py-3 text-[10px] text-neutral-400 text-center">{mobileText('还有', 'Altri')} {selectedProduct.skus.length - 12} {mobileText('个规格', 'varianti')}</div>}
                </div>
              </div>

              {selectedProduct.fabric && (
                <div className="rounded-2xl bg-neutral-50 px-4 py-3 flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] font-semibold text-neutral-500">{mobileText('面料', 'Tessuto')}</div>
                    <div className="text-[12px] font-bold text-neutral-700 mt-0.5">{selectedProduct.fabric}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl px-5 py-4 border-t border-neutral-100">
              <div className="flex justify-end">
                <button type="button" onClick={() => setSelectedProduct(null)} className="h-11 px-5 rounded-2xl bg-neutral-100 text-neutral-700 text-[13px] font-bold active:scale-[0.98] transition-transform">{mobileText('关闭', 'Chiudi')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Fulfill Modal for Mobile */}
      {selectedOrderToFulfill && selectedOrder && nextFulfillmentAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">{nextFulfillmentAction.label}</h3>
              <button onClick={() => setSelectedOrderToFulfill(null)} className="text-neutral-400 hover:text-neutral-600">✕</button>
            </div>

            {nextFulfillmentAction.status === 'shipped' && (
              <div className="space-y-2 text-xs">
                {shipmentsLoading ? (
                  <div className="rounded-lg bg-neutral-50 p-3 text-neutral-500">正在读取已发包裹...</div>
                ) : (
                  <>
                    {shipments.length > 0 && (
                      <div className="rounded-lg bg-blue-50 p-3 text-blue-800">
                        已创建 {shipments.length} 个包裹，本次仅填写剩余未发数量。
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-neutral-600 font-medium block">本次发货明细</label>
                      {selectedOrder.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="flex-1 truncate text-neutral-700">{item.styleNo} / {item.color} / {item.size}</span>
                          <span className="text-[10px] text-neutral-400">共 {item.quantity}</span>
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={shipmentQuantities[item.id] ?? 0}
                            onChange={(event) => setShipmentQuantities(previous => ({
                              ...previous,
                              [item.id]: Math.min(item.quantity, Math.max(0, Number(event.target.value) || 0))
                            }))}
                            className="w-16 rounded-lg border border-neutral-300 bg-neutral-50 p-2 text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <label className="text-neutral-600 font-medium block">快递承运商</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full p-2 bg-neutral-50 rounded-lg border border-neutral-300"
                >
                  <option value="DHL Express">DHL Express 欧洲特快</option>
                  <option value="UPS Express">UPS Express Saver</option>
                  <option value="GLS Italy">GLS Italy 现货快线</option>
                  <option value="TNT / FedEx">TNT / FedEx 专线</option>
                </select>

                <label className="text-neutral-600 font-medium block pt-1">快递单号（可自动生成）</label>
                <input
                  type="text"
                  placeholder="例如: IT-DHL-8890214"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  className="w-full p-2 bg-neutral-50 rounded-lg border border-neutral-300"
                />
              </div>
            )}

            <button
              onClick={() => void handleQuickFulfill()}
              disabled={fulfillmentBusy}
              className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl"
            >
              {fulfillmentBusy ? '提交中...' : `${nextFulfillmentAction.label}并通知买手`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
