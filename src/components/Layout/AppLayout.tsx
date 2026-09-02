import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RecordSaleModal } from '../modals/RecordSaleModal';
import { ProductFormModal } from '../modals/ProductFormModal';
import { CreatePurchaseOrderModal } from '../modals/CreatePurchaseOrderModal';

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);

  // Key to force re-renders/refresh when an action completes
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleActionSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenRecordSale={() => setSaleModalOpen(true)}
          onOpenAddProduct={() => setProductModalOpen(true)}
          onOpenCreatePO={() => setPoModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshTrigger, handleActionSuccess }} />
        </main>
      </div>

      {/* Global Modals */}
      <RecordSaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={handleActionSuccess}
      />

      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSuccess={handleActionSuccess}
      />

      <CreatePurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
};
