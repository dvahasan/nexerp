/**
 * Icon.jsx — universal icon component
 * Reads company.activeIconPack from context and renders from the correct library.
 * Pack values: "material" (default) | "heroicons" | "lucide" | "phosphor"
 *
 * Usage: <Icon name="dashboard" size={20} className="text-blue-500" />
 */
import { useAppContext } from '../context/AppContext';

// ── Material (react-icons/md) ──────────────────────────────────────────────
import {
  MdDashboard, MdInventory, MdListAlt, MdPeople, MdSettings, MdMenu, MdClose,
  MdDarkMode, MdLightMode, MdTranslate, MdAdd, MdEdit, MdDelete, MdSearch,
  MdSwapVert, MdImage, MdSave, MdCloudUpload, MdWarning, MdError,
  MdAttachMoney, MdTrendingUp, MdCheck, MdArrowBack, MdVisibility,
  MdVisibilityOff, MdLogout, MdBusiness, MdCategory, MdQrCode,
  MdFilterList, MdRefresh, MdExpandMore, MdExpandLess, MdInfo,
  MdStar, MdChat, MdSend, MdAutoAwesome, MdPerson, MdNotifications,
  MdLock, MdEmail, MdPhone, MdHome, MdInsights, MdColorLens,
} from 'react-icons/md';

// ── Heroicons (outline) ───────────────────────────────────────────────────
import {
  HomeIcon, ArchiveBoxIcon, ListBulletIcon, UsersIcon, Cog6ToothIcon,
  Bars3Icon, XMarkIcon, MoonIcon, SunIcon, LanguageIcon, PlusIcon,
  PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowsUpDownIcon, PhotoIcon,
  CloudArrowUpIcon, ExclamationTriangleIcon, ExclamationCircleIcon,
  CurrencyDollarIcon, ArrowTrendingUpIcon, CheckIcon, ArrowLeftIcon,
  EyeIcon, EyeSlashIcon, ArrowRightOnRectangleIcon, BuildingOfficeIcon,
  TagIcon, QrCodeIcon, FunnelIcon, ArrowPathIcon, ChevronDownIcon,
  ChevronUpIcon, InformationCircleIcon, StarIcon, ChatBubbleLeftIcon,
  PaperAirplaneIcon, SparklesIcon, UserIcon, BellIcon, LockClosedIcon,
  EnvelopeIcon, PhoneIcon,
} from '@heroicons/react/24/outline';

// ── Lucide ────────────────────────────────────────────────────────────────
import {
  LayoutDashboard, Package, ClipboardList, Users, Settings, Menu, X,
  Moon, Sun, Languages, Plus, Pencil, Trash2, Search, ArrowUpDown,
  ImageIcon, CloudUpload, AlertTriangle, AlertCircle, DollarSign,
  TrendingUp, Check, ArrowLeft, Eye, EyeOff, LogOut, Building2,
  Tag, QrCode, Filter, RefreshCw, ChevronDown, ChevronUp, Info,
  Star, MessageSquare, Send, Sparkles, User, Bell, Lock, Mail, Phone,
} from 'lucide-react';

// ── Phosphor ──────────────────────────────────────────────────────────────
import {
  House, Package as PhPackage, ClipboardText, Users as PhUsers, GearSix,
  List, X as PhX, Moon as PhMoon, Sun as PhSun, Translate,
  Plus as PhPlus, PencilSimple, Trash, MagnifyingGlass, ArrowsDownUp,
  Image, CloudArrowUp, Warning, WarningCircle, CurrencyDollar, TrendUp as PhTrending,
  Check as PhCheck, ArrowLeft as PhArrowLeft, Eye as PhEye, EyeSlash,
  SignOut, Buildings, Tag as PhTag, QrCode as PhQr, Funnel, ArrowClockwise,
  CaretDown, CaretUp, Info as PhInfo, Star as PhStar, Chat, PaperPlaneRight,
  Sparkle, User as PhUser, Bell as PhBell, Lock as PhLock, EnvelopeSimple, Phone as PhPhone,
} from 'phosphor-react';

// ── Icon name → component map per pack ────────────────────────────────────
const ICON_MAP = {
  material: {
    dashboard: MdDashboard, inventory: MdInventory, transactions: MdListAlt,
    users: MdPeople, settings: MdSettings, menu: MdMenu, close: MdClose,
    dark: MdDarkMode, light: MdLightMode, translate: MdTranslate,
    add: MdAdd, edit: MdEdit, delete: MdDelete, search: MdSearch,
    swap: MdSwapVert, image: MdImage, save: MdSave, upload: MdCloudUpload,
    warning: MdWarning, error: MdError, money: MdAttachMoney,
    trending: MdTrendingUp, check: MdCheck, back: MdArrowBack,
    eye: MdVisibility, eyeOff: MdVisibilityOff, logout: MdLogout,
    company: MdBusiness, category: MdCategory, barcode: MdQrCode,
    filter: MdFilterList, refresh: MdRefresh, expand: MdExpandMore,
    collapse: MdExpandLess, info: MdInfo, star: MdStar, chat: MdChat,
    send: MdSend, ai: MdAutoAwesome, user: MdPerson, bell: MdNotifications,
    lock: MdLock, email: MdEmail, phone: MdPhone, home: MdHome,
    insights: MdInsights, theme: MdColorLens,
  },
  heroicons: {
    dashboard: HomeIcon, inventory: ArchiveBoxIcon, transactions: ListBulletIcon,
    users: UsersIcon, settings: Cog6ToothIcon, menu: Bars3Icon, close: XMarkIcon,
    dark: MoonIcon, light: SunIcon, translate: LanguageIcon,
    add: PlusIcon, edit: PencilIcon, delete: TrashIcon, search: MagnifyingGlassIcon,
    swap: ArrowsUpDownIcon, image: PhotoIcon, save: CloudArrowUpIcon, upload: CloudArrowUpIcon,
    warning: ExclamationTriangleIcon, error: ExclamationCircleIcon, money: CurrencyDollarIcon,
    trending: ArrowTrendingUpIcon, check: CheckIcon, back: ArrowLeftIcon,
    eye: EyeIcon, eyeOff: EyeSlashIcon, logout: ArrowRightOnRectangleIcon,
    company: BuildingOfficeIcon, category: TagIcon, barcode: QrCodeIcon,
    filter: FunnelIcon, refresh: ArrowPathIcon, expand: ChevronDownIcon,
    collapse: ChevronUpIcon, info: InformationCircleIcon, star: StarIcon,
    chat: ChatBubbleLeftIcon, send: PaperAirplaneIcon, ai: SparklesIcon,
    user: UserIcon, bell: BellIcon, lock: LockClosedIcon, email: EnvelopeIcon, phone: PhoneIcon,
    home: HomeIcon, insights: ArrowTrendingUpIcon, theme: Cog6ToothIcon,
  },
  lucide: {
    dashboard: LayoutDashboard, inventory: Package, transactions: ClipboardList,
    users: Users, settings: Settings, menu: Menu, close: X,
    dark: Moon, light: Sun, translate: Languages,
    add: Plus, edit: Pencil, delete: Trash2, search: Search,
    swap: ArrowUpDown, image: ImageIcon, save: CloudUpload, upload: CloudUpload,
    warning: AlertTriangle, error: AlertCircle, money: DollarSign,
    trending: TrendingUp, check: Check, back: ArrowLeft,
    eye: Eye, eyeOff: EyeOff, logout: LogOut,
    company: Building2, category: Tag, barcode: QrCode,
    filter: Filter, refresh: RefreshCw, expand: ChevronDown,
    collapse: ChevronUp, info: Info, star: Star,
    chat: MessageSquare, send: Send, ai: Sparkles,
    user: User, bell: Bell, lock: Lock, email: Mail, phone: Phone,
    home: LayoutDashboard, insights: TrendingUp, theme: Settings,
  },
  phosphor: {
    dashboard: House, inventory: PhPackage, transactions: ClipboardText,
    users: PhUsers, settings: GearSix, menu: List, close: PhX,
    dark: PhMoon, light: PhSun, translate: Translate,
    add: PhPlus, edit: PencilSimple, delete: Trash, search: MagnifyingGlass,
    swap: ArrowsDownUp, image: Image, save: CloudArrowUp, upload: CloudArrowUp,
    warning: Warning, error: WarningCircle, money: CurrencyDollar,
    trending: PhTrending, check: PhCheck, back: PhArrowLeft,
    eye: PhEye, eyeOff: EyeSlash, logout: SignOut,
    company: Buildings, category: PhTag, barcode: PhQr,
    filter: Funnel, refresh: ArrowClockwise, expand: CaretDown,
    collapse: CaretUp, info: PhInfo, star: PhStar,
    chat: Chat, send: PaperPlaneRight, ai: Sparkle,
    user: PhUser, bell: PhBell, lock: PhLock, email: EnvelopeSimple, phone: PhPhone,
    home: House, insights: PhTrending, theme: GearSix,
  },
};

export const ICON_PACKS = [
  { key: 'material',  label: 'Material Icons',  desc: 'Google Material Design icons' },
  { key: 'heroicons', label: 'Heroicons',        desc: 'By the Tailwind team' },
  { key: 'lucide',    label: 'Lucide',           desc: 'Clean, minimal open-source' },
  { key: 'phosphor',  label: 'Phosphor Icons',   desc: 'Flexible, multi-weight family' },
];

export default function Icon({ name, size = 20, className = '', style = {} }) {
  // Safe: falls back to material if context isn't available yet
  let pack = 'material';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useAppContext();
    pack = ctx?.company?.activeIconPack || 'material';
  } catch {
    // context not yet available during render
  }

  const map = ICON_MAP[pack] || ICON_MAP.material;
  const Component = map[name] || ICON_MAP.material[name];
  if (!Component) return null;

  // Phosphor uses `weight` prop; others use `size`
  if (pack === 'phosphor') {
    return <Component size={size} className={className} style={style} />;
  }
  return <Component size={size} className={className} style={style} />;
}
