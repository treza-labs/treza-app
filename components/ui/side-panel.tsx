"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePrivy } from '@privy-io/react-auth';
import { Shield, Zap, Key, LogOut, FileText, Menu, X } from 'lucide-react';
import { Transition } from "@headlessui/react";
import Logo from "./logo";

export default function SidePanel() {
  const { authenticated, user, logout } = usePrivy();
  const [activeTab, setActiveTab] = useState<string>('enclaves');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  const trigger = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'enclaves', label: 'Enclaves', icon: Shield },
    { id: 'tasks', label: 'Tasks', icon: Zap },
    { id: 'api-keys', label: 'API Keys', icon: Key },
  ];

  // Listen for navigation events to sync active state
  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      setActiveTab(event.detail);
      setMobileMenuOpen(false); // Close mobile menu when navigating
    };
    
    window.addEventListener('navigate-to-tab', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate-to-tab', handleNavigation as EventListener);
  }, []);

  // Close mobile menu on click outside (simplified)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!mobileNav.current || !trigger.current) return;
      
      // Don't close if clicking on the trigger button or inside the menu
      if (
        trigger.current.contains(target) ||
        mobileNav.current.contains(target)
      ) {
        return;
      }
      
      setMobileMenuOpen(false);
    };
    
    // Add a small delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", clickHandler);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", clickHandler);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on escape key
  useEffect(() => {
    const keyHandler = ({ keyCode }: { keyCode: number }): void => {
      if (!mobileMenuOpen || keyCode !== 27) return;
      setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [mobileMenuOpen]);

  const handleMenuItemClick = (itemId: string) => {
    setActiveTab(itemId);
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: itemId }));
  };

  // Mobile Hamburger Button
  const MobileMenuButton = () => (
    <button
      ref={trigger}
      className="md:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-gray-900/90 backdrop-blur-sm border border-gray-800 text-white hover:bg-gray-800 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        setMobileMenuOpen(!mobileMenuOpen);
      }}
      aria-label="Toggle menu"
    >
      {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );

  // Desktop Side Panel
  const DesktopSidePanel = () => (
    <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-gray-900/95 border-r border-gray-800 backdrop-blur-sm z-40">
      <SidePanelContent />
    </div>
  );

  // Mobile Side Panel (Overlay)
  const MobileSidePanel = () => (
    <div ref={mobileNav} className="md:hidden">
      <Transition
        show={mobileMenuOpen}
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setMobileMenuOpen(false)}
        />
      </Transition>
      
      <Transition
        show={mobileMenuOpen}
        enter="transition-transform duration-300 ease-out"
        enterFrom="-translate-x-full"
        enterTo="translate-x-0"
        leave="transition-transform duration-300 ease-in"
        leaveFrom="translate-x-0"
        leaveTo="-translate-x-full"
      >
        <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-gray-900/95 border-r border-gray-800 backdrop-blur-sm z-50">
          <div className="relative h-full">
            {/* Close button inside the panel */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors z-10"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <SidePanelContent />
          </div>
        </div>
      </Transition>
    </div>
  );

  // Shared Content Component
  const SidePanelContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Logo />
          <span className="text-xl font-bold text-white tracking-widest">T R E Z A</span>
        </div>
      </div>

      {/* User Info */}
      {authenticated && user && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user.email?.address ? user.email.address[0].toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.email?.address || 'User'}
              </p>
              <p className="text-xs text-gray-400">Authenticated</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-500/20 text-white border border-indigo-500/30' 
                    : 'text-white hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => handleMenuItemClick(item.id)}
              >
                <IconComponent 
                  size={18} 
                  className={isActive ? 'text-indigo-400' : 'text-gray-400'} 
                />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {/* Docs Link */}
          <div className="pt-4 mt-4 border-t border-gray-800">
            <a
              href="https://docs.trezalabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center space-x-3 px-3 py-2 text-white hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText size={18} className="text-gray-400" />
              <span className="font-medium">Documentation</span>
            </a>
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        {authenticated ? (
          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 btn-sm bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%] cursor-pointer"
          >
            <LogOut size={16} className="text-gray-400" />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="text-center">
            <p className="text-xs text-gray-500">Connect to access features</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <MobileMenuButton />
      <DesktopSidePanel />
      <MobileSidePanel />
    </div>
  );
} 