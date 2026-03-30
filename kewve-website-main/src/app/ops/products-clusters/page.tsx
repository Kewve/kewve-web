'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { titleFont, josefinSemiBold, josefinRegular } from '@/utils';
import { adminAPI } from '@/lib/api';
import { asMongoIdString, displayIdSuffix } from '@/lib/mongoId';
import { Loader2, Package, Plus, Layers, Wallet, Users, CircleEllipsis, X, CreditCard, MapPin } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Grains & Cereals',
  'Spices & Herbs',
  'Seeds & Nuts',
  'Oils & Fats',
  'Beverages',
  'Fresh Produce',
  'Processed Food',
  'Others',
];

const PRODUCT_FORM_OPTIONS = [
  'Powder',
  'Dried',
  'Oil',
  'Fresh',
  'Frozen',
  'Paste',
  'Puree',
  'Whole',
  'Other',
];

interface ProductItem {
  _id: string;
  name: string;
  category: string;
  unitPrice: number;
  monthlyCapacity?: number;
  userId?: string;
  verification: 'pending' | 'verified' | 'rejected';
  readiness: 'draft' | 'pending' | 'approved';
  hasImage: boolean;
  createdAt: string;
  producer: {
    name: string;
    email: string;
    businessName?: string;
  } | null;
}

const verificationStyles: Record<string, string> = {
  pending: 'border-amber-300 text-amber-700 bg-amber-50',
  verified: 'border-green-300 text-green-700 bg-green-50',
  rejected: 'border-red-300 text-red-700 bg-red-50',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusPillClass(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'verified' || s === 'ready') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'pending' || s === 'open') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (s === 'rejected' || s === 'failed' || s === 'closed') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [clusters, setClusters] = useState<any[]>([]);
  const [creatingCluster, setCreatingCluster] = useState(false);
  const [clusterForm, setClusterForm] = useState({
    productName: '',
    category: CATEGORY_OPTIONS[0],
    productForm: PRODUCT_FORM_OPTIONS[0],
    targetMarket: 'Both' as 'UK' | 'EU' | 'Both',
    supplyCountry: '',
    minimumExportVolumeKg: '10000',
    availabilityWindow: '',
    specificationSummary: '',
  });
  const [clusterActionLoadingKey, setClusterActionLoadingKey] = useState<string | null>(null);
  const [settlementBusyKey, setSettlementBusyKey] = useState<string | null>(null);
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, string>>({});
  const [deletingClusterId, setDeletingClusterId] = useState<string | null>(null);
  const [detailCluster, setDetailCluster] = useState<any | null>(null);
  const [clusterTab, setClusterTab] = useState<'active' | 'past'>('active');
  const [clusterIssueBusy, setClusterIssueBusy] = useState(false);
  const [addProducerOpen, setAddProducerOpen] = useState(false);
  const [addProducerForm, setAddProducerForm] = useState({
    productId: '',
    committedKg: '',
  });
  const [addProducerBusy, setAddProducerBusy] = useState(false);
  const [clusterDeliveryMode, setClusterDeliveryMode] = useState<'buyer_profile' | 'custom'>('buyer_profile');
  const [clusterDeliveryCustom, setClusterDeliveryCustom] = useState({
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    company: '',
  });
  const [clusterDeliveryBusy, setClusterDeliveryBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getProducts();
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadClusters = async () => {
    setClustersLoading(true);
    try {
      const res = await adminAPI.getClusters();
      if (res.success) setClusters(res.data || []);
      else setClusters([]);
    } catch {
      setClusters([]);
    } finally {
      setClustersLoading(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  const clusterIdHighlight = searchParams.get('clusterId');

  useEffect(() => {
    if (!clusterIdHighlight || clustersLoading) return;
    const id = asMongoIdString(clusterIdHighlight);
    if (!id) return;
    const row = clusters.find((c) => String(c._id) === id);
    if (!row) return;
    const past = !['open', 'pending', 'ready'].includes(String(row.status || '').toLowerCase());
    const nextTab = past ? 'past' : 'active';
    setClusterTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [clusterIdHighlight, clustersLoading, clusters]);

  useEffect(() => {
    if (!clusterIdHighlight || clustersLoading) return;
    const id = asMongoIdString(clusterIdHighlight);
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(`ops-cluster-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [clusterIdHighlight, clustersLoading, clusterTab, clusters]);

  const createCluster = async () => {
    if (!clusterForm.productName.trim() || !clusterForm.category.trim()) return;
    setCreatingCluster(true);
    try {
      await adminAPI.createCluster({
        productName: clusterForm.productName,
        category: clusterForm.category,
        productForm: clusterForm.productForm,
        targetMarket: clusterForm.targetMarket,
        supplyCountry: clusterForm.supplyCountry.trim() || undefined,
        minimumExportVolumeKg: Number(clusterForm.minimumExportVolumeKg || 0),
        availabilityWindow: clusterForm.availabilityWindow,
        specificationSummary: clusterForm.specificationSummary,
      });
      setClusterForm({
        productName: '',
        category: CATEGORY_OPTIONS[0],
        productForm: PRODUCT_FORM_OPTIONS[0],
        targetMarket: 'Both',
        supplyCountry: '',
        minimumExportVolumeKg: '10000',
        availabilityWindow: '',
        specificationSummary: '',
      });
      await loadClusters();
    } finally {
      setCreatingCluster(false);
    }
  };

  const eur = (cents: number) => `€${(Number(cents || 0) / 100).toFixed(2)}`;

  const updateSettlementSupply = async (clusterId: string, entryId: string, supplyStatus: string) => {
    const key = `${clusterId}:${entryId}:${supplyStatus}`;
    try {
      setSettlementBusyKey(key);
      const res = await adminAPI.updateClusterSettlementSupply(clusterId, entryId, supplyStatus as any);
      if (res.payoutWarning) {
        window.alert(`Supply updated. Payout note: ${res.payoutWarning}`);
      }
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to update supply status.');
    } finally {
      setSettlementBusyKey(null);
    }
  };

  const retrySettlementPayout = async (clusterId: string, entryId: string) => {
    const key = `payout:${clusterId}:${entryId}`;
    try {
      setSettlementBusyKey(key);
      await adminAPI.retryClusterSettlementPayout(clusterId, entryId);
      await loadClusters();
    } finally {
      setSettlementBusyKey(null);
    }
  };

  const payoutInputKey = (clusterId: string, entryId: string) => `${clusterId}:${entryId}`;

  const setPayoutDraft = (clusterId: string, entryId: string, value: string) => {
    setPayoutDrafts((prev) => ({ ...prev, [payoutInputKey(clusterId, entryId)]: value }));
  };

  const saveSettlementPayoutAmount = async (clusterId: string, entryId: string, amountText: string) => {
    const normalized = String(amountText || '').trim().replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      window.alert('Enter a valid non-negative amount.');
      return;
    }
    const amountCents = Math.round(parsed * 100);
    const key = `edit-payout:${clusterId}:${entryId}`;
    try {
      setSettlementBusyKey(key);
      await adminAPI.updateClusterSettlementPayoutAmount(clusterId, entryId, amountCents);
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to update payout amount.');
    } finally {
      setSettlementBusyKey(null);
    }
  };

  const reviewContribution = async (
    clusterId: string,
    contributionId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => {
    const key = `${clusterId}:${contributionId}:${action}`;
    try {
      setClusterActionLoadingKey(key);
      await adminAPI.reviewClusterContribution(clusterId, contributionId, action, notes);
      await loadClusters();
    } finally {
      setClusterActionLoadingKey(null);
    }
  };

  const deleteProduct = async (product: ProductItem) => {
    const confirmed = window.confirm(`Delete "${product.name || 'this product'}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setDeletingProductId(product._id);
      await adminAPI.deleteProduct(product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      await loadClusters();
    } finally {
      setDeletingProductId(null);
    }
  };

  const deleteCluster = async (cluster: any) => {
    const confirmed = window.confirm(
      `Delete cluster "${cluster.clusterId ? displayIdSuffix(cluster.clusterId) : cluster.productName || 'this cluster'}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setDeletingClusterId(String(cluster._id));
      await adminAPI.deleteCluster(String(cluster._id));
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to delete cluster.');
    } finally {
      setDeletingClusterId(null);
    }
  };

  const detailSupplierCount = useMemo(() => {
    if (!detailCluster) return 0;
    return (detailCluster.contributions || []).filter((c: any) => String(c.status || '') === 'approved').length;
  }, [detailCluster]);

  const removeContribution = async (clusterId: string, contributionId: string) => {
    const confirmed = window.confirm('Remove this producer from the cluster?');
    if (!confirmed) return;
    try {
      setClusterActionLoadingKey(`rm:${clusterId}:${contributionId}`);
      const res = await adminAPI.removeClusterContribution(clusterId, contributionId);
      if (res?.data) setDetailCluster(res.data);
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to remove producer.');
    } finally {
      setClusterActionLoadingKey(null);
    }
  };

  const resolveClusterIssues = async (cluster: any) => {
    const closeAsReceivedOk = window.confirm('Close issue as "received ok"? (Cancel keeps order open but clears issue flag)');
    const notes = String(window.prompt('Optional admin note for issue resolution') || '').trim();
    try {
      setClusterIssueBusy(true);
      const res = await adminAPI.resolveClusterIssues(String(cluster._id), { closeAsReceivedOk, adminNotes: notes });
      if (res?.data) setDetailCluster(res.data);
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to resolve cluster issues.');
    } finally {
      setClusterIssueBusy(false);
    }
  };

  const refundClusterPurchase = async (cluster: any) => {
    const paidTotalCents = Number(cluster?.settlement?.totalPaidCents || 0);
    const amtText = String(window.prompt('Refund amount in euros (leave blank for full refund)') || '').trim();
    const note = String(window.prompt('Optional refund note') || '').trim();
    let amountCents: number | undefined;
    if (amtText) {
      const parsed = Number(amtText.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        window.alert('Enter a valid positive refund amount.');
        return;
      }
      amountCents = Math.round(parsed * 100);
      if (paidTotalCents > 0 && amountCents > paidTotalCents) {
        window.alert('Refund amount cannot exceed paid total.');
        return;
      }
    }
    try {
      setClusterIssueBusy(true);
      const res = await adminAPI.refundClusterPurchase(String(cluster._id), { amountCents, note });
      if (res?.data) setDetailCluster(res.data);
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to refund cluster purchase.');
    } finally {
      setClusterIssueBusy(false);
    }
  };

  const eligibleProductsForCluster = useMemo(() => {
    if (!detailCluster) return [];
    const cat = String(detailCluster.category || '').toLowerCase();
    const existingProducerIds = new Set(
      (detailCluster.contributions || []).map((c: { producerId?: string }) => String(c.producerId || ''))
    );
    return products.filter((p) => {
      if (String(p.category || '').toLowerCase() !== cat) return false;
      if (p.verification !== 'verified' || p.readiness !== 'approved') return false;
      const uid = p.userId;
      if (uid && existingProducerIds.has(String(uid))) return false;
      return true;
    });
  }, [products, detailCluster]);

  const selectedProductForAdd = useMemo(
    () => eligibleProductsForCluster.find((p) => p._id === addProducerForm.productId),
    [eligibleProductsForCluster, addProducerForm.productId]
  );

  const submitAddProducer = async () => {
    if (!detailCluster?._id) return;
    const pid = addProducerForm.productId.trim();
    const kg = Number(String(addProducerForm.committedKg || '').trim().replace(',', '.'));
    if (!pid || !Number.isFinite(kg) || kg < 1) {
      window.alert('Select a product and enter committed kg (1 or more).');
      return;
    }
    setAddProducerBusy(true);
    try {
      const res = await adminAPI.addClusterContribution(String(detailCluster._id), {
        productId: pid,
        committedKg: kg,
        status: 'approved',
      });
      if (res?.data) setDetailCluster(res.data);
      setAddProducerForm({ productId: '', committedKg: '' });
      setAddProducerOpen(false);
      await loadClusters();
    } catch (e: any) {
      window.alert(e?.message || 'Failed to add producer.');
    } finally {
      setAddProducerBusy(false);
    }
  };

  const activeClusters = clusters.filter((c) => ['open', 'pending', 'ready'].includes(String(c.status || '').toLowerCase()));
  const closedClusters = clusters.filter((c) => String(c.status || '').toLowerCase() === 'closed');
  const pendingProducts = products.filter((p) => p.verification === 'pending').length;
  const approvedProducts = products.filter((p) => p.verification === 'verified').length;

  const detailClusterLocked =
    String(detailCluster?.status || '').toLowerCase() === 'closed' ||
    !!detailCluster?.purchase?.paidAt ||
    !!detailCluster?.purchase?.invoice?.sentAt;

  const canEditClusterDelivery =
    !!detailCluster &&
    (!!detailCluster.purchase?.invoice?.sentAt || !!detailCluster.purchase?.paidAt);

  useEffect(() => {
    if (!detailCluster) return;
    const dd = detailCluster.purchase?.deliveryDestination;
    if (dd?.mode) setClusterDeliveryMode(dd.mode);
    if (dd?.address && dd.mode === 'custom') {
      const a = dd.address;
      setClusterDeliveryCustom({
        line1: String(a.line1 || ''),
        line2: String(a.line2 || ''),
        city: String(a.city || ''),
        postalCode: String(a.postalCode || ''),
        country: String(a.country || ''),
        phone: String(a.phone || ''),
        company: String(a.company || ''),
      });
    }
  }, [detailCluster?._id, detailCluster?.purchase?.deliveryDestination?.setAt]);

  const saveClusterDelivery = async () => {
    if (!detailCluster?._id || !canEditClusterDelivery) return;
    setClusterDeliveryBusy(true);
    try {
      if (clusterDeliveryMode === 'buyer_profile') {
        await adminAPI.updateClusterDelivery(String(detailCluster._id), { mode: 'buyer_profile' });
      } else {
        const { line1, city, postalCode, country, line2, phone, company } = clusterDeliveryCustom;
        if (!line1.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
          window.alert('Custom address needs line1, city, postal code, and country.');
          return;
        }
        await adminAPI.updateClusterDelivery(String(detailCluster._id), {
          mode: 'custom',
          address: {
            line1: line1.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            country: country.trim(),
            ...(line2.trim() ? { line2: line2.trim() } : {}),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
            ...(company.trim() ? { company: company.trim() } : {}),
          },
        });
      }
      const res = await adminAPI.getClusters();
      if (res.success && res.data) {
        const c = res.data.find((x: any) => String(x._id) === String(detailCluster._id));
        if (c) setDetailCluster(c);
        setClusters(res.data);
      }
    } catch (e: any) {
      window.alert(e?.message || 'Failed to save delivery.');
    } finally {
      setClusterDeliveryBusy(false);
    }
  };

  return (
    <div className='max-w-6xl mx-auto space-y-8 pb-8'>
      <h1 className={`text-2xl lg:text-3xl text-gray-900 ${titleFont.className}`}>Products & Clusters</h1>

      <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='rounded-xl bg-white shadow-sm p-4'>
          <div className='flex items-center gap-2 text-gray-500 mb-1'>
            <Layers className='w-4 h-4' />
            <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Active clusters</span>
          </div>
          <p className={`text-2xl text-gray-900 ${josefinSemiBold.className}`}>{activeClusters.length}</p>
        </div>
        <div className='rounded-xl bg-white shadow-sm p-4'>
          <div className='flex items-center gap-2 text-gray-500 mb-1'>
            <Layers className='w-4 h-4' />
            <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Closed clusters</span>
          </div>
          <p className={`text-2xl text-gray-700 ${josefinSemiBold.className}`}>{closedClusters.length}</p>
        </div>
        <div className='rounded-xl bg-white shadow-sm p-4'>
          <div className='flex items-center gap-2 text-gray-500 mb-1'>
            <Package className='w-4 h-4' />
            <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Pending products</span>
          </div>
          <p className={`text-2xl text-amber-700 ${josefinSemiBold.className}`}>{pendingProducts}</p>
        </div>
        <div className='rounded-xl bg-white shadow-sm p-4'>
          <div className='flex items-center gap-2 text-gray-500 mb-1'>
            <Wallet className='w-4 h-4' />
            <span className={`text-xs uppercase tracking-wide ${josefinSemiBold.className}`}>Approved products</span>
          </div>
          <p className={`text-2xl text-emerald-700 ${josefinSemiBold.className}`}>{approvedProducts}</p>
        </div>
      </section>

      <section className='rounded-xl bg-white shadow-sm p-5 space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Create Aggregation Cluster</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          <input
            value={clusterForm.productName}
            onChange={(e) => setClusterForm((p) => ({ ...p, productName: e.target.value }))}
            placeholder='Product'
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}
          />
          <select
            value={clusterForm.category}
            onChange={(e) => setClusterForm((p) => ({ ...p, category: e.target.value }))}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            value={clusterForm.minimumExportVolumeKg}
            onChange={(e) => setClusterForm((p) => ({ ...p, minimumExportVolumeKg: e.target.value }))}
            placeholder='Quantity (kg)'
            type='number'
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}
          />
          <select
            value={clusterForm.targetMarket}
            onChange={(e) => setClusterForm((p) => ({ ...p, targetMarket: e.target.value as 'UK' | 'EU' | 'Both' }))}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}>
            <option value='Both'>UK / EU</option>
            <option value='UK'>UK</option>
            <option value='EU'>EU</option>
          </select>
          <input
            value={clusterForm.supplyCountry}
            onChange={(e) => setClusterForm((p) => ({ ...p, supplyCountry: e.target.value }))}
            placeholder='Supply from'
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}
          />
          <select
            value={clusterForm.productForm}
            onChange={(e) => setClusterForm((p) => ({ ...p, productForm: e.target.value }))}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${josefinRegular.className}`}>
            {PRODUCT_FORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={createCluster}
          disabled={creatingCluster}
          className={`inline-flex items-center gap-2 bg-brand-green text-white rounded-lg px-4 py-2.5 text-sm disabled:opacity-70 ${josefinSemiBold.className}`}>
          <Plus className='w-4 h-4' />
          {creatingCluster ? 'Creating...' : 'Create Cluster'}
        </button>
      </section>

      <section className='space-y-4'>
        <div>
          <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Clusters</h2>
          <div
            className='inline-flex gap-2 mt-3'
            role='tablist'
            aria-label='Cluster period'>
            <button
              type='button'
              role='tab'
              aria-selected={clusterTab === 'active'}
              onClick={() => setClusterTab('active')}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${josefinSemiBold.className} ${
                clusterTab === 'active'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}>
              Active
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={clusterTab === 'past'}
              onClick={() => setClusterTab('past')}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${josefinSemiBold.className} ${
                clusterTab === 'past'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}>
              Past
            </button>
          </div>
        </div>
        {clustersLoading ? (
          <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>Loading clusters...</p>
        ) : (clusterTab === 'active' ? activeClusters : closedClusters).length === 0 ? (
          <div className='rounded-xl bg-white shadow-sm py-10 text-center text-sm text-gray-500'>
            {clusterTab === 'active' ? 'No active clusters yet.' : 'No past clusters yet.'}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {(clusterTab === 'active' ? activeClusters : closedClusters).map((cluster) => {
              const approvedVol = Number(cluster.totalApprovedVolumeKg || 0);
              const minVol = Number(cluster.minimumExportVolumeKg || 0);
              const supplierCount = (cluster.contributions || []).filter((c: any) => c.status === 'approved').length;
              const isPast = clusterTab === 'past';
              return (
                <div
                  key={cluster._id}
                  id={`ops-cluster-${String(cluster._id)}`}
                  className={`rounded-xl bg-white shadow-sm p-5 ${isPast ? 'border border-gray-100' : ''}`}>
                  <p className={`text-xs text-gray-500 font-mono ${josefinRegular.className}`}>{displayIdSuffix(cluster.clusterId)}</p>
                  <h3 className={`text-lg text-gray-900 mt-1 ${josefinSemiBold.className}`}>{cluster.productName}</h3>
                  <p className={`text-sm text-gray-500 mt-1 ${josefinRegular.className}`}>
                    {approvedVol.toLocaleString()} / {minVol.toLocaleString()} kg filled
                  </p>
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${statusPillClass(cluster.status)}`}>
                      {cluster.status || 'unknown'}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs text-gray-600 ${josefinRegular.className}`}>
                      <Users className='w-3.5 h-3.5' />
                      Suppliers: {supplierCount}
                    </span>
                  </div>
                  <div className={`mt-4 flex ${isPast ? '' : 'gap-2'}`}>
                    <button
                      type='button'
                      onClick={() => setDetailCluster(cluster)}
                      className={`${isPast ? 'w-full' : 'flex-1'} rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                      {isPast ? 'View details' : 'View'}
                    </button>
                    {!isPast ? (
                      <button
                        type='button'
                        onClick={() => setDetailCluster(cluster)}
                        className={`flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                        Add supply
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className='rounded-xl bg-white shadow-sm overflow-hidden'>
        <div className='px-5 pt-5 pb-3'>
          <h2 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Products</h2>
        </div>
        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
          </div>
        ) : products.length === 0 ? (
          <div className='py-16 text-center'>
            <Package className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No products found.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='text-sm text-gray-500 uppercase tracking-wider'>
                  <th className='text-left py-4 px-5 font-medium'>Product</th>
                  <th className='text-left py-4 px-5 font-medium'>Producer</th>
                  <th className='text-left py-4 px-5 font-medium'>Category</th>
                  <th className='text-left py-4 px-5 font-medium'>Price</th>
                  <th className='text-left py-4 px-5 font-medium'>Status</th>
                  <th className='text-left py-4 px-5 font-medium'>Date</th>
                  <th className='text-left py-4 px-5 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className='border-t border-gray-100 text-sm text-gray-900'>
                    <td className='py-4 px-5'>
                      <div className='flex items-center gap-3'>
                        {product.hasImage ? (
                          <img
                            src={adminAPI.getProductImageUrl(product._id)}
                            alt={product.name}
                            className='w-9 h-9 rounded-lg object-cover bg-gray-100'
                          />
                        ) : (
                          <div className='w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center'>
                            <Package className='w-4 h-4 text-gray-400' />
                          </div>
                        )}
                        <span className={josefinSemiBold.className}>{product.name || 'Untitled'}</span>
                      </div>
                    </td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>
                      {product.producer?.businessName || product.producer?.name || '-'}
                    </td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>{product.category || '-'}</td>
                    <td className={`py-4 px-5 ${josefinRegular.className}`}>
                      {product.unitPrice ? `€${product.unitPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className='py-4 px-5'>
                      <span
                        className={`inline-flex items-center border rounded-full px-3 py-0.5 text-xs capitalize ${
                          verificationStyles[product.verification] ?? 'border-gray-300 text-gray-600'
                        }`}>
                        {product.verification}
                      </span>
                    </td>
                    <td className={`py-4 px-5 text-gray-500 ${josefinRegular.className}`}>
                      {formatDate(product.createdAt)}
                    </td>
                    <td className='py-4 px-5'>
                      <details className='relative'>
                        <summary className='list-none inline-flex cursor-pointer items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50'>
                          <CircleEllipsis className='w-3.5 h-3.5' />
                          Actions
                        </summary>
                        <div className='absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 bg-white shadow-md z-10'>
                          <Link
                            href={`/ops/products-clusters/${product._id}`}
                            className='block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50'>
                            Review
                          </Link>
                          <button
                            onClick={() => deleteProduct(product)}
                            disabled={deletingProductId === product._id}
                            className='block w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60'>
                            {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailCluster ? (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <button type='button' className='absolute inset-0 bg-black/40' onClick={() => setDetailCluster(null)} aria-label='Close' />
          <div className='relative w-full max-w-2xl h-full bg-white border-l border-gray-200 shadow-xl overflow-y-auto'>
            <div className='sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between'>
              <div>
                <p className={`text-xs text-gray-500 font-mono ${josefinRegular.className}`}>{displayIdSuffix(detailCluster.clusterId)}</p>
                <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>{detailCluster.productName} — Settlement</h3>
              </div>
              <button type='button' onClick={() => setDetailCluster(null)} className='p-2 rounded hover:bg-gray-100'>
                <X className='w-5 h-5 text-gray-600' />
              </button>
            </div>
            <div className='p-4 space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div className='rounded-lg border border-gray-100 p-3'>
                  <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Status</p>
                  <p className={`text-sm text-gray-900 capitalize ${josefinSemiBold.className}`}>{detailCluster.status || '—'}</p>
                </div>
                <div className='rounded-lg border border-gray-100 p-3'>
                  <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Supply region</p>
                  <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{detailCluster.supplyCountry || 'Any'}</p>
                </div>
                <div className='rounded-lg border border-gray-100 p-3'>
                  <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Suppliers</p>
                  <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>{detailSupplierCount}</p>
                </div>
              </div>

              <div className='rounded-lg bg-gray-50 p-3 space-y-1'>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Cluster details</p>
                <p className={`text-sm text-gray-800 ${josefinRegular.className}`}>
                  {detailCluster.category ? `${detailCluster.category}` : '—'}
                  {detailCluster.productForm ? ` · ${detailCluster.productForm}` : ''}
                  {detailCluster.targetMarket ? ` · ${detailCluster.targetMarket}` : ''}
                </p>
                {detailCluster.availabilityWindow ? (
                  <p className={`text-xs text-gray-600 ${josefinRegular.className}`}>Availability: {detailCluster.availabilityWindow}</p>
                ) : null}
                {detailCluster.specificationSummary ? (
                  <p className={`text-xs text-gray-600 ${josefinRegular.className}`}>{detailCluster.specificationSummary}</p>
                ) : null}
              </div>

              <div className='rounded-lg border border-gray-100 p-3 space-y-1'>
                <div className='flex items-center gap-2 text-gray-600'>
                  <CreditCard className='w-4 h-4' />
                  <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Payment</p>
                </div>
                {detailCluster.purchase?.paidAt || detailCluster.purchase?.invoice?.sentAt ? (
                  <div className={`text-sm text-gray-800 space-y-0.5 ${josefinRegular.className}`}>
                    <p>
                      Buyer: <span className={josefinSemiBold.className}>{detailCluster.purchase.buyerName || '—'}</span>{' '}
                      <span className='text-gray-500'>{detailCluster.purchase.buyerEmail || ''}</span>
                    </p>
                    {detailCluster.purchase?.invoice?.sentAt ? (
                      <p>Invoice sent: {new Date(detailCluster.purchase.invoice.sentAt).toLocaleString()}</p>
                    ) : null}
                    {detailCluster.purchase?.paidAt ? (
                      <p>Paid: {new Date(detailCluster.purchase.paidAt).toLocaleString()}</p>
                    ) : (
                      <p className='text-amber-700'>Awaiting payment</p>
                    )}
                    <p>
                      Volume: {Number(detailCluster.purchase.volumeKg || 0).toLocaleString()} kg
                      {detailCluster.purchase.market ? ` · ${detailCluster.purchase.market}` : ''}
                      {detailCluster.purchase.timeline ? ` · ${detailCluster.purchase.timeline}` : ''}
                    </p>
                    {detailCluster.purchase.stripeCheckoutSessionId ? (
                      <p className='font-mono text-xs text-gray-500 break-all'>Session: {detailCluster.purchase.stripeCheckoutSessionId}</p>
                    ) : null}
                    <p className='capitalize'>
                      Buyer receipt: {String(detailCluster.purchase?.buyerReceipt || 'none').replace(/_/g, ' ')}
                    </p>
                    {detailCluster.purchase?.issuesNeedAdmin ? (
                      <p className='text-amber-700'>Issue open — admin action required.</p>
                    ) : null}
                    {detailCluster.purchase?.refund?.status ? (
                      <p className='capitalize'>
                        Refund: {String(detailCluster.purchase.refund.status)}{' '}
                        {Number(detailCluster.purchase?.refund?.amountCents || 0) > 0
                          ? `(${eur(Number(detailCluster.purchase.refund.amountCents || 0))})`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>Not paid yet.</p>
                )}
              </div>

              <div className='rounded-lg border border-gray-100 p-3 space-y-3'>
                <div className='flex items-center gap-2 text-gray-600'>
                  <MapPin className='w-4 h-4' />
                  <p className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Delivery</p>
                </div>
                {detailCluster.purchase?.deliveryDestination?.address ? (
                  <div className={`text-sm text-gray-800 space-y-0.5 ${josefinRegular.className}`}>
                    <p className='text-xs text-gray-500'>
                      Mode:{' '}
                      {detailCluster.purchase.deliveryDestination.mode === 'buyer_profile'
                        ? 'Buyer saved address (snapshot)'
                        : 'Custom address'}
                    </p>
                    {detailCluster.purchase.deliveryDestination.address.company ? (
                      <p>{detailCluster.purchase.deliveryDestination.address.company}</p>
                    ) : null}
                    <p>{detailCluster.purchase.deliveryDestination.address.line1}</p>
                    {detailCluster.purchase.deliveryDestination.address.line2 ? (
                      <p>{detailCluster.purchase.deliveryDestination.address.line2}</p>
                    ) : null}
                    <p>
                      {[detailCluster.purchase.deliveryDestination.address.city, detailCluster.purchase.deliveryDestination.address.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p>{detailCluster.purchase.deliveryDestination.address.country}</p>
                    {detailCluster.purchase.deliveryDestination.address.phone ? (
                      <p>Phone: {detailCluster.purchase.deliveryDestination.address.phone}</p>
                    ) : null}
                    {detailCluster.purchase.deliveryDestination.setAt ? (
                      <p className='text-xs text-gray-500'>
                        Set {new Date(detailCluster.purchase.deliveryDestination.setAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className={`text-sm text-gray-600 ${josefinRegular.className}`}>
                    {canEditClusterDelivery
                      ? 'Choose where suppliers should ship. Producers see this in Trade Operations once saved.'
                      : 'Available after an invoice is sent or the buyer has paid.'}
                  </p>
                )}
                {canEditClusterDelivery ? (
                  <div className='space-y-2 border-t border-gray-100 pt-3'>
                    <label className={`flex items-center gap-2 text-sm ${josefinRegular.className}`}>
                      <input
                        type='radio'
                        name='cdm'
                        checked={clusterDeliveryMode === 'buyer_profile'}
                        onChange={() => setClusterDeliveryMode('buyer_profile')}
                      />
                      Use buyer&apos;s saved delivery address (from their profile)
                    </label>
                    <label className={`flex items-center gap-2 text-sm ${josefinRegular.className}`}>
                      <input
                        type='radio'
                        name='cdm'
                        checked={clusterDeliveryMode === 'custom'}
                        onChange={() => setClusterDeliveryMode('custom')}
                      />
                      Enter a custom delivery address
                    </label>
                    {clusterDeliveryMode === 'custom' ? (
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        <input
                          placeholder='Company (optional)'
                          value={clusterDeliveryCustom.company}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, company: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm sm:col-span-2'
                        />
                        <input
                          placeholder='Address line 1 *'
                          value={clusterDeliveryCustom.line1}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, line1: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm sm:col-span-2'
                        />
                        <input
                          placeholder='Address line 2'
                          value={clusterDeliveryCustom.line2}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, line2: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm sm:col-span-2'
                        />
                        <input
                          placeholder='City *'
                          value={clusterDeliveryCustom.city}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, city: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm'
                        />
                        <input
                          placeholder='Postal code *'
                          value={clusterDeliveryCustom.postalCode}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, postalCode: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm'
                        />
                        <input
                          placeholder='Country *'
                          value={clusterDeliveryCustom.country}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, country: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm sm:col-span-2'
                        />
                        <input
                          placeholder='Phone (optional)'
                          value={clusterDeliveryCustom.phone}
                          onChange={(e) => setClusterDeliveryCustom((p) => ({ ...p, phone: e.target.value }))}
                          className='border border-gray-300 rounded px-2 py-1.5 text-sm sm:col-span-2'
                        />
                      </div>
                    ) : null}
                    <button
                      type='button'
                      disabled={clusterDeliveryBusy}
                      onClick={saveClusterDelivery}
                      className={`text-sm bg-brand-green text-white rounded-lg px-3 py-2 disabled:opacity-60 ${josefinSemiBold.className}`}>
                      {clusterDeliveryBusy ? 'Saving…' : 'Save delivery destination'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className='rounded-lg bg-gray-50 p-3'>
                <p className={`text-xs text-gray-500 ${josefinRegular.className}`}>Money flow</p>
                <div className='mt-1 text-sm text-gray-800'>
                  Buyer paid <strong>{eur(detailCluster?.settlement?.totalPaidCents || 0)}</strong> → Platform fee{' '}
                  <strong>{eur(detailCluster?.settlement?.platformFeeCents || 0)}</strong> → Supplier payout{' '}
                  <strong>
                    {eur((detailCluster?.settlement?.entries || []).reduce((sum: number, row: any) => sum + Number(row.netPayoutCents || 0), 0))}
                  </strong>
                </div>
              </div>

              {Array.isArray(detailCluster.contributions) && detailCluster.contributions.length > 0 ? (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <h4 className={`text-sm text-gray-900 ${josefinSemiBold.className}`}>Producers in this cluster</h4>
                    {!detailClusterLocked ? (
                      <button
                        type='button'
                        onClick={() => {
                          setAddProducerForm({ productId: '', committedKg: '' });
                          setAddProducerOpen(true);
                        }}
                        className={`text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 ${josefinSemiBold.className}`}>
                        + Add producer
                      </button>
                    ) : null}
                  </div>
                  {detailCluster.contributions.map((c: any) => (
                    <div key={c._id} className='rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between gap-2 text-xs'>
                      <span className={josefinRegular.className}>
                        <span className='text-gray-900'>{c.producerName}</span> • {c.productName} • {Number(c.committedKg || 0)}kg{' '}
                        <span className='text-gray-500'>({c.status})</span>
                      </span>
                      <div className='flex flex-wrap items-center gap-2 justify-end'>
                        {!detailClusterLocked && c.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => reviewContribution(detailCluster._id, c._id, 'approved')}
                              disabled={clusterActionLoadingKey === `${detailCluster._id}:${c._id}:approved`}
                              className='px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50'>
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt('Enter reason for rejection');
                                if (!reason || !reason.trim()) return;
                                reviewContribution(detailCluster._id, c._id, 'rejected', reason.trim());
                              }}
                              disabled={clusterActionLoadingKey === `${detailCluster._id}:${c._id}:rejected`}
                              className='px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50'>
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 capitalize ${statusPillClass(c.status)}`}>{c.status}</span>
                        )}
                        {!detailClusterLocked ? (
                          <button
                            type='button'
                            onClick={() => removeContribution(detailCluster._id, c._id)}
                            disabled={clusterActionLoadingKey === `rm:${detailCluster._id}:${c._id}`}
                            className='px-2 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60'>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {detailCluster.purchase?.paidAt && detailCluster.settlement?.entries?.length ? (
                <div className='overflow-x-auto'>
                  <table className='w-full text-xs border border-gray-200 rounded'>
                    <thead className='bg-gray-50 text-left'>
                      <tr>
                        <th className='p-2'>Seller</th>
                        <th className='p-2'>Kg</th>
                        <th className='p-2'>Payout</th>
                        <th className='p-2'>Supply</th>
                        <th className='p-2'>Transfer</th>
                        <th className='p-2'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCluster.settlement.entries.map((e: any) => (
                        <tr key={e._id} className='border-t border-gray-100'>
                          <td className='p-2'>{e.producerName}</td>
                          <td className='p-2'>{Number(e.allocatedKg || 0).toLocaleString()}</td>
                          <td className='p-2'>
                            <div className='flex items-center gap-1'>
                              <input
                                type='number'
                                min={0}
                                step='0.01'
                                value={payoutDrafts[payoutInputKey(detailCluster._id, e._id)] ?? (Number(e.netPayoutCents || 0) / 100).toFixed(2)}
                                onChange={(ev) => setPayoutDraft(detailCluster._id, e._id, ev.target.value)}
                                disabled={e.payout?.status === 'completed' || e.payout?.status === 'pending'}
                                className='w-24 border border-gray-300 rounded px-1 py-0.5'
                              />
                              <button
                                type='button'
                                onClick={() =>
                                  saveSettlementPayoutAmount(
                                    detailCluster._id,
                                    e._id,
                                    payoutDrafts[payoutInputKey(detailCluster._id, e._id)] ??
                                      (Number(e.netPayoutCents || 0) / 100).toFixed(2)
                                  )
                                }
                                disabled={
                                  e.payout?.status === 'completed' ||
                                  e.payout?.status === 'pending' ||
                                  settlementBusyKey === `edit-payout:${detailCluster._id}:${e._id}`
                                }
                                className='text-[11px] border border-gray-300 rounded px-1 py-0.5 text-gray-700'>
                                Save
                              </button>
                            </div>
                          </td>
                          <td className='p-2'>
                            <select
                              value={e.supplyStatus || 'pending'}
                              disabled={!!settlementBusyKey && settlementBusyKey.startsWith(`${detailCluster._id}:${e._id}`)}
                              onChange={(ev) => updateSettlementSupply(detailCluster._id, e._id, ev.target.value)}
                              className='border border-gray-300 rounded px-1 py-0.5 max-w-[6.5rem]'>
                              <option value='pending'>Pending</option>
                              <option value='delivered'>Delivered</option>
                              <option value='verified'>Verified</option>
                              <option value='accepted'>Accepted</option>
                            </select>
                          </td>
                          <td className='p-2 capitalize'>{e.payout?.status || 'none'}</td>
                          <td className='p-2'>
                            {e.payout?.status === 'failed' ? (
                              <button
                                type='button'
                                disabled={settlementBusyKey === `payout:${detailCluster._id}:${e._id}`}
                                onClick={() => retrySettlementPayout(detailCluster._id, e._id)}
                                className='text-[11px] border border-amber-400 rounded px-1 py-0.5 text-amber-900'>
                                Retry
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={`text-sm text-gray-500 ${josefinRegular.className}`}>No settlement ledger available yet.</p>
              )}

              <div className='pt-2 flex justify-between'>
                <div className='flex gap-2'>
                  {detailCluster?.purchase?.issuesNeedAdmin ? (
                    <button
                      type='button'
                      onClick={() => resolveClusterIssues(detailCluster)}
                      disabled={clusterIssueBusy}
                      className='text-xs border border-amber-300 text-amber-900 bg-amber-50 rounded px-3 py-1.5 disabled:opacity-60'>
                      Resolve issue
                    </button>
                  ) : null}
                  {detailCluster?.purchase?.paidAt &&
                  String(detailCluster?.purchase?.refund?.status || '') !== 'completed' ? (
                    <button
                      type='button'
                      onClick={() => refundClusterPurchase(detailCluster)}
                      disabled={clusterIssueBusy}
                      className='text-xs border border-sky-300 text-sky-800 bg-sky-50 rounded px-3 py-1.5 disabled:opacity-60'>
                      Refund buyer
                    </button>
                  ) : null}
                </div>
                <button
                  type='button'
                  onClick={() => deleteCluster(detailCluster)}
                  disabled={detailClusterLocked || deletingClusterId === String(detailCluster._id)}
                  className='text-xs border border-red-300 text-red-700 bg-red-50 rounded px-3 py-1.5 disabled:opacity-60'>
                  {deletingClusterId === String(detailCluster._id) ? 'Deleting...' : 'Delete cluster'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailCluster && addProducerOpen ? (
        <div className='fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl border border-gray-200 p-4 max-w-md w-full shadow max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className={`text-lg text-gray-900 ${josefinSemiBold.className}`}>Add producer to cluster</h3>
              <button type='button' onClick={() => setAddProducerOpen(false)} className='p-2 rounded hover:bg-gray-100' aria-label='Close'>
                <X className='w-5 h-5 text-gray-600' />
              </button>
            </div>
            <div className='space-y-3'>
              <div>
                <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Product</label>
                <select
                  value={addProducerForm.productId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const p = eligibleProductsForCluster.find((x) => x._id === id);
                    const cap = Number(p?.monthlyCapacity || 0);
                    setAddProducerForm((prev) => ({
                      productId: id,
                      committedKg: id && cap > 0 ? String(Math.floor(cap)) : prev.committedKg,
                    }));
                  }}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white ${josefinRegular.className}`}>
                  <option value=''>Choose an approved product in this category…</option>
                  {eligibleProductsForCluster.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {' — '}
                      {p.producer?.businessName || p.producer?.name || 'Producer'}
                      {p.producer?.email ? ` (${p.producer.email})` : ''}
                    </option>
                  ))}
                </select>
                <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                  Same rules as when a producer joins: verified listing, approved product, category matches this cluster, and producer country
                  matches supply region when the cluster specifies one.
                </p>
                {eligibleProductsForCluster.length === 0 ? (
                  <p className={`text-xs text-amber-800 mt-2 ${josefinRegular.className}`}>
                    No eligible products (need verified + approved products in “{detailCluster.category}” whose producer is not already in this
                    cluster).
                  </p>
                ) : null}
              </div>
              <div>
                <label className={`block text-sm text-gray-700 mb-1 ${josefinSemiBold.className}`}>Committed kg</label>
                <input
                  value={addProducerForm.committedKg}
                  onChange={(e) => setAddProducerForm((p) => ({ ...p, committedKg: e.target.value }))}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${josefinRegular.className}`}
                  placeholder='e.g. 200'
                  inputMode='decimal'
                />
                {selectedProductForAdd ? (
                  <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                    Monthly capacity for this listing: {Number(selectedProductForAdd.monthlyCapacity || 0).toLocaleString()} kg (committed amount is
                    capped to this).
                  </p>
                ) : null}
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setAddProducerOpen(false)}
                  className='text-sm border border-gray-300 rounded px-3 py-1.5'>
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={submitAddProducer}
                  disabled={addProducerBusy}
                  className={`text-sm bg-brand-green text-white rounded px-3 py-1.5 disabled:opacity-60 ${josefinSemiBold.className}`}>
                  {addProducerBusy ? 'Adding…' : 'Add producer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
