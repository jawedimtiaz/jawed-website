import React from 'react';
import {
  Briefcase,
  Laptop,
  TrendingUp,
  Home,
  Utensils,
  Zap,
  GraduationCap,
  HeartPulse,
  Car,
  ShoppingBag,
  ArrowLeftRight,
  Landmark,
  Wallet,
  CreditCard,
  Receipt,
  PiggyBank,
} from 'lucide-react';

export const renderCategoryIcon = (iconName?: string, size = 18): React.ReactNode => {
  switch (iconName) {
    case 'Briefcase':
      return <Briefcase size={size} />;
    case 'Laptop':
      return <Laptop size={size} />;
    case 'TrendingUp':
      return <TrendingUp size={size} />;
    case 'Home':
      return <Home size={size} />;
    case 'Utensils':
      return <Utensils size={size} />;
    case 'Zap':
      return <Zap size={size} />;
    case 'GraduationCap':
      return <GraduationCap size={size} />;
    case 'HeartPulse':
      return <HeartPulse size={size} />;
    case 'Car':
      return <Car size={size} />;
    case 'ShoppingBag':
      return <ShoppingBag size={size} />;
    case 'ArrowLeftRight':
      return <ArrowLeftRight size={size} />;
    case 'PiggyBank':
      return <PiggyBank size={size} />;
    default:
      return <Receipt size={size} />;
  }
};

export const renderAccountTypeIcon = (type: 'Bank' | 'Cash' | 'Card', size = 18): React.ReactNode => {
  switch (type) {
    case 'Bank':
      return <Landmark size={size} />;
    case 'Cash':
      return <Wallet size={size} />;
    case 'Card':
      return <CreditCard size={size} />;
    default:
      return <Landmark size={size} />;
  }
};
