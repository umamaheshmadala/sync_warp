import {
    Repeat, Package, Layers, Percent, Wallet, ShoppingCart, Users, Clock,
    Ticket, Tag, CreditCard, Gift, Calendar, PlusCircle, Shield, Zap,
    LucideIcon
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
    'repeat': Repeat,
    'package': Package,
    'layers': Layers,
    'percent': Percent,
    'wallet': Wallet,
    'shopping-cart': ShoppingCart,
    'users': Users,
    'clock': Clock,
    'ticket': Ticket,
    'tag': Tag,
    'credit-card': CreditCard,
    'gift': Gift,
    'calendar': Calendar,
    'plus-circle': PlusCircle,
    'shield': Shield,
    'zap': Zap,
};

export const getCategoryIcon = (iconName: string): LucideIcon => {
    return CATEGORY_ICON_MAP[iconName] || Tag;
};
