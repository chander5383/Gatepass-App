import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function GatepassApp() {
  const [category, setCategory] = useState('STOCK TRANSFER VOUCHER');
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [tagNo, setTagNo] = useState('');
  const [includeSerialTag, setIncludeSerialTag] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [fromSite, setFromSite] = useState('GWTPL Abohar');
  const [toSite, setToSite] = useState('GWTPL Muktsar-1');
  const [authority, setAuthority] = useState('Sh. Sandeep Kumar (Mohali)');
  const [issuedBy, setIssuedBy] = useState('Vijay Kumar');

  // Gatepass prefix - start with GWTPL/ABOHAR/2025/
  const basePrefix = 'GWTPL/ABOHAR/2025/';
  const [passCount, setPassCount] = useState(Number(localStorage.getItem('gatepassCount') || 1));
  const passNumber = `${basePrefix}${String(passCount).padStart(3, '0')}`;

  const addItem = () => {
    if (!itemName || !qty) return;
    const newItem = { itemName, qty, serialNo, tagNo, includeSerialTag };
    setItems([...items, newItem]);
    setItemName('');
    setQty('');
    setSerialNo('');
    setTagNo('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    const sheetUrl = 'https://script.google.com/macros/s/AKfycbzU4RZaXvlfmrETBiVKFe_iOXYWcqVQ5km9W1F7uTno6nfgUsau0wSshRjaLgVZXOrQ/exec';
    const payload = {
      date,
      passNumber,
      category,
      fromSite,
      toSite,
      authority,
      issuedBy,
      items,
    };

    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      alert('Data saved to Google Sheet!');
      localStorage.setItem('gatepassCount', passCount + 1);
      setPassCount(passCount + 1);
    } catch (e) {
      alert('Error saving data.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-8 relative">
        <div className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-[url('https://gwtpl.co/logo.png')]" />

        <div className="flex justify-center mb-4">
          <img src="https://gwtpl.co/logo.png" alt="Company Logo" className="h-16" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">GLOBUS WAREHOUSING & TRADING PRIVATE LIMITED</h1>
        <h2 className="text-lg text-center font-semibold">{fromSite.toUpperCase()}</h2>

        {/* Category Dropdown */}
        <div className="flex justify-center mb-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded p-2 text-sm"
          >
            <option value="STOCK TRANSFER VOUCHER">STOCK TRANSFER VOUCHER</option>
            <option value="Stock Voucher (Returnable Stock)">Stock Voucher (Returnable Stock)</option>
          </select>
        </div>

        <h3 className="text-sm text-center mb-4">{category}</h3>

        <div className="flex justify-between mb-4 text-sm">
          <div className="flex items-center gap-2">
            <label>Gate Pass No:</label>
            <input type="text" value={passNumber} readOnly className="border p-1 rounded w-60 bg-gray-100" />
          </div>
          <div className="flex items-center gap-2">
            <label>Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-1 rounded" />
          </div>
        </div>

        <Card className="mb-4">
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm">Transferred From</label>
                <input value={fromSite} onChange={(e) => setFromSite(e.target.value)} className="border p-1 w-full rounded" />
              </div>
              <div>
                <label className="text-sm">Transferred To</label>
                <input value={toSite} onChange={(e) => setToSite(e.target.value)} className="border p-1 w-full rounded" />
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <input type="checkbox" checked={includeSerialTag} onChange={() => setIncludeSerialTag(!includeSerialTag)} />
              <label className="text-sm">Include Serial No. & Tag No.</label>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-2">
              <input placeholder="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="border p-1 rounded col-span-2" />
              <input placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} className="border p-1 rounded" />
              {includeSerialTag && (
                <>
                  <input placeholder="Serial No." value={serialNo} onChange={(e) => setSerialNo(e.target.value)} className="border p-1 rounded" />
                  <input placeholder="Tag No." value={tagNo} onChange={(e) => setTagNo(e.target.value)} className="border p-1 rounded" />
                </>
              )}
              <Button onClick={addItem}>Add</Button>
            </div>

            <table className="w-full text-sm border mt-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-1">Sr.No</th>
                  <th className="border p-1">Item Name</th>
                  <th className="border p-1">Qty</th>
                  {includeSerialTag && <th className="border p-1">Serial No.</th>}
                  {includeSerialTag && <th className="border p-1">Tag No.</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border p-1 text-center">{index + 1}</td>
                    <td className="border p-1">{item.itemName}</td>
                    <td className="border p-1 text-center">{item.qty}</td>
                    {includeSerialTag && <td className="border p-1">{item.serialNo}</td>}
                    {includeSerialTag && <td className="border p-1">{item.tagNo}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-sm mt-4 italic text-center">Goods are not for sale only site to site transfer</p>

            <div className="mt-6 grid grid-cols-2 text-sm">
              <div>
                <p><b>Authority Person:</b> <input value={authority} onChange={(e) => setAuthority(e.target.value)} className="border-b border-dashed p-1 w-full" /></p>
                <p><b>Consignor Unit:</b> <input value={toSite} onChange={(e) => setToSite(e.target.value)} className="border-b border-dashed p-1 w-full" /></p>
                <p><b>Station Manager:</b> {toSite}</p>
              </div>
              <div className="text-right">
                <p><b>Issued By:</b> <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} className="border-b border-dashed p-1 w-full text-right" /></p>
                <p><b>Consignor Unit:</b> <input value={fromSite} onChange={(e) => setFromSite(e.target.value)} className="border-b border-dashed p-1 w-full text-right" /></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 print:hidden">
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={handlePrint}>Print</Button>
        </div>
      </div>
    </div>
  );
}