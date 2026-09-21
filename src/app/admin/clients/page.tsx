"use client";

import { useState, useEffect } from "react";
import { useAdminToast } from "../layout";

interface Client {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminClientsPage() {
  const { showToast } = useAdminToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setAddingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName.trim() }),
      });
      if (res.ok) {
        showToast("Client added successfully!", "success");
        setNewClientName("");
        setShowAddForm(false);
        fetchClients();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to add client", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setAddingClient(false);
    }
  };

  const updateClient = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        showToast("Client updated!", "success");
        setEditingId(null);
        fetchClients();
      }
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const toggleClient = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        showToast(isActive ? "Client deactivated" : "Client activated", "success");
        fetchClients();
      }
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const deleteClient = async (id: number) => {
    if (!confirm("Deactivate this client? They will be hidden from the task submission form.")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Client deactivated", "success");
        fetchClients();
      }
    } catch {
      showToast("Failed to deactivate", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Clients</h1>
          <p className="text-text-secondary">Manage your client list</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary px-5 py-2.5"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Client
          </span>
        </button>
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 slide-up">
          <form onSubmit={addClient} className="flex gap-3">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="input-glass flex-1"
              placeholder="Enter client name..."
              autoFocus
              required
            />
            <button type="submit" disabled={addingClient} className="btn-success px-6 disabled:opacity-50">
              {addingClient ? "Adding..." : "Add"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost px-4">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Client List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-16 rounded-2xl" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-text-secondary">No clients found</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {clients.map((client) => (
            <div key={client.id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {editingId === client.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-glass text-sm py-1"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") updateClient(client.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <button onClick={() => updateClient(client.id)} className="text-green-400 hover:text-green-300 text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text-secondary text-sm">Cancel</button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-text-primary">{client.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge ${client.isActive ? "badge-approved" : "badge-rejected"}`}>
                  {client.isActive ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => { setEditingId(client.id); setEditName(client.name); }}
                  className="p-2 rounded-lg hover:bg-glass-hover text-text-muted hover:text-text-primary transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button
                  onClick={() => client.isActive ? deleteClient(client.id) : toggleClient(client.id, false)}
                  className={`p-2 rounded-lg hover:bg-glass-hover transition-colors ${client.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                  title={client.isActive ? "Deactivate" : "Activate"}
                >
                  {client.isActive ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
