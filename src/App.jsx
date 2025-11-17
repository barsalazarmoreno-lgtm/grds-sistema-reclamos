import React, { useState, useEffect } from 'react';
import { Search, Plus, X, LogOut, FileSpreadsheet, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import * as XLSX from 'xlsx';

const SUPABASE_URL = 'https://pqzawvguspvjjwuqgyfo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxemF3dmd1c3B2amp3dXFneWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDg1ODMsImV4cCI6MjA3ODk4NDU4M30.KyQ99Ghaw-uTEwbGEExx6IyLiYnTD1r1s3mEOxvjQng';
const EMAILJS_PUBLIC_KEY = 'Y0nd9sEq3OTgK4fKj';
const EMAILJS_SERVICE_ID = 'GRDS Reclamos';
const EMAILJS_TEMPLATE_ID = 'reclamo_nuevo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
emailjs.init(EMAILJS_PUBLIC_KEY);

function App() {
  const [usuario, setUsuario] = useState(null);
  const [reclamos, setReclamos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(true);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registroForm, setRegistroForm] = useState({ 
    nombre: '', email: '', password: '', rol: 'operador', sucursal: ''
  });
  const [formulario, setFormulario] = useState({
    nombre: '', email: '', telefono: '', asunto: '',
    descripcion: '', categoria: 'general', urgencia: 'media', sucursal: ''
  });

  const sucursales = [
    { id: 'renaca', nombre: 'Reñaca' },
    { id: 'vina', nombre: 'Viña' },
    { id: 'quilpue', nombre: 'Quilpué' },
    { id: 'galvarino', nombre: 'Galvarino' },
    { id: 'barrio_italia', nombre: 'Barrio Italia' },
    { id: 'apoquindo', nombre: 'Apoquindo' },
    { id: 'vitacura', nombre: 'Vitacura' },
    { id: 'rancagua', nombre: 'Rancagua' }
  ];

  useEffect(() => {
    verificarConexion();
  }, []);

  const verificarConexion = async () => {
    try {
      const { data } = await supabase.from('usuarios').select('count');
      setCargando(false);
    } catch (error) {
      console.error('Error:', error);
      setCargando(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      alert('Completa todos los campos');
      return;
    }

    const { data } = await supabase
      .from('usuarios')
      .select()
      .eq('email', loginForm.email)
      .eq('password', loginForm.password)
      .single();

    if (data) {
      setUsuario(data);
      setMostrarLogin(false);
      cargarDatos();
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleRegistro = async () => {
    if (!registroForm.nombre || !registroForm.email || !registroForm.password) {
      alert('Completa todos los campos');
      return;
    }

    const { data: existente } = await supabase
      .from('usuarios')
      .select()
      .eq('email', registroForm.email)
      .single();

    if (existente) {
      alert('Email ya registrado');
      return;
    }

    await supabase.from('usuarios').insert({
      nombre: registroForm.nombre,
      email: registroForm.email,
      password: registroForm.password,
      rol: registroForm.rol,
      sucursal: registroForm.sucursal
    });

    setRegistroForm({ nombre: '', email: '', password: '', rol: 'operador', sucursal: '' });
    setMostrarRegistro(false);
    alert('Usuario registrado exitosamente');
  };

  const cargarDatos = async () => {
    const { data: reclamosData } = await supabase
      .from('reclamos')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*');

    if (reclamosData) setReclamos(reclamosData);
    if (usuariosData) setUsuarios(usuariosData);
  };

  const handleSubmit = async () => {
    if (!formulario.nombre || !formulario.email || !formulario.asunto || !formulario.sucursal) {
      alert('Completa los campos obligatorios (*)');
      return;
    }

    const nuevoReclamo = {
      nombre_cliente: formulario.nombre,
      email_cliente: formulario.email,
      telefono_cliente: formulario.telefono,
      asunto: formulario.asunto,
      descripcion: formulario.descripcion,
      categoria: formulario.categoria,
      urgencia: formulario.urgencia,
      sucursal: formulario.sucursal,
      estado: 'pendiente',
      creado_por: usuario?.nombre || 'Sistema',
      historial: JSON.stringify([{
        fecha: new Date().toISOString(),
        accion: 'Reclamo creado',
        usuario: usuario?.nombre || 'Sistema'
      }])
    };

    const { data } = await supabase
      .from('reclamos')
      .insert(nuevoReclamo)
      .select()
      .single();

    if (data) {
      setReclamos([data, ...reclamos]);
      enviarEmail(data, 'creado');
      setFormulario({
        nombre: '', email: '', telefono: '', asunto: '',
        descripcion: '', categoria: 'general', urgencia: 'media', sucursal: ''
      });
      setMostrarFormulario(false);
      alert('✅ Reclamo registrado y email enviado');
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const reclamo = reclamos.find(r => r.id === id);
    const historial = JSON.parse(reclamo.historial || '[]');
    
    const { data } = await supabase
      .from('reclamos')
      .update({
        estado: nuevoEstado,
        historial: JSON.stringify([...historial, {
          fecha: new Date().toISOString(),
          accion: `Estado cambiado a ${nuevoEstado}`,
          usuario: usuario?.nombre
        }]),
        fecha_resolucion: nuevoEstado === 'resuelto' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (data) {
      setReclamos(reclamos.map(r => r.id === id ? data : r));
      enviarEmail(data, nuevoEstado);
      alert(`✅ Estado actualizado: ${nuevoEstado}`);
    }
  };

  const asignarReclamo = async (id, usuarioAsignado) => {
    const reclamo = reclamos.find(r => r.id === id);
    const historial = JSON.parse(reclamo.historial || '[]');

    const { data } = await supabase
      .from('reclamos')
      .update({
        asignado_a: usuarioAsignado,
        historial: JSON.stringify([...historial, {
          fecha: new Date().toISOString(),
          accion: `Asignado a ${usuarioAsignado}`,
          usuario: usuario?.nombre
        }])
      })
      .eq('id', id)
      .select()
      .single();

    if (data) {
      setReclamos(reclamos.map(r => r.id === id ? data : r));
      alert(`✅ Asignado a ${usuarioAsignado}`);
    }
  };

  const eliminarReclamo = async (id) => {
    if (usuario?.rol !== 'admin') {
      alert('Solo administradores pueden eliminar');
      return;
    }

    if (window.confirm('¿Eliminar este reclamo?')) {
      await supabase.from('reclamos').delete().eq('id', id);
      setReclamos(reclamos.filter(r => r.id !== id));
    }
  };

  const enviarEmail = async (reclamo, tipo) => {
    const sucursal = sucursales.find(s => s.id === reclamo.sucursal);
    let asunto = '';
    let mensaje = '';

    if (tipo === 'creado') {
      asunto = `Reclamo Recibido #${reclamo.id} - GRDS`;
      mensaje = `Estimado/a ${reclamo.nombre_cliente},\n\nHemos recibido su reclamo #${reclamo.id}.\n\nSucursal: ${sucursal?.nombre}\nUrgencia: ${reclamo.urgencia}\n\nGracias,\nGRDS`;
    } else if (tipo === 'resuelto') {
      asunto = `✅ Reclamo #${reclamo.id} Resuelto - GRDS`;
      mensaje = `Estimado/a ${reclamo.nombre_cliente},\n\nSu reclamo #${reclamo.id} ha sido resuelto.\n\nGracias por su paciencia.\nGRDS`;
    } else if (tipo === 'en_proceso') {
      asunto = `🔄 Reclamo #${reclamo.id} En Proceso - GRDS`;
      mensaje = `Estimado/a ${reclamo.nombre_cliente},\n\nSu reclamo #${reclamo.id} está siendo atendido.\n\nGRDS`;
    }

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: reclamo.email_cliente,
        to_name: reclamo.nombre_cliente,
        subject: asunto,
        message: mensaje,
        reclamo_id: reclamo.id
      });
      console.log('✅ Email enviado');
    } catch (error) {
      console.error('Error al enviar email:', error);
    }
  };

  const exportarExcel = () => {
    const datos = reclamosFiltrados.map(r => ({
      ID: r.id,
      Fecha: new Date(r.created_at).toLocaleDateString('es-ES'),
      Cliente: r.nombre_cliente,
      Email: r.email_cliente,
      Sucursal: r.sucursal,
      Estado: r.estado,
      Urgencia: r.urgencia
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reclamos');
    XLSX.writeFile(wb, `Reclamos_GRDS_${Date.now()}.xlsx`);
  };

  const reclamosFiltrados = reclamos.filter(r => {
    if (usuario?.rol === 'operador' && usuario?.sucursal !== 'todas') {
      if (r.sucursal !== usuario.sucursal) return false;
    }
    const cumpleFiltro = filtro === 'todos' || r.estado === filtro;
    const cumpleBusqueda = !busqueda || 
      r.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.asunto?.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const getEstadoColor = (estado) => {
    if (estado === 'pendiente') return 'bg-yellow-100 text-yellow-800';
    if (estado === 'en_proceso') return 'bg-blue-100 text-blue-800';
    if (estado === 'resuelto') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getUrgenciaColor = (urgencia) => {
    if (urgencia === 'critica') return 'bg-red-600 text-white';
    if (urgencia === 'alta') return 'bg-orange-500 text-white';
    if (urgencia === 'media') return 'bg-yellow-400 text-gray-900';
    return 'bg-green-500 text-white';
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Cargando GRDS...</div>
      </div>
    );
  }

  if (mostrarLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">GRDS</h1>
            <p className="text-gray-600">Sistema de Gestión de Reclamos</p>
            <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs inline-block">
              🟢 Base de Datos en la Nube
            </div>
          </div>

          {!mostrarRegistro ? (
            <>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold mt-6"
              >
                Iniciar Sesión
              </button>

              <button
                onClick={() => setMostrarRegistro(true)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold mt-3"
              >
                Crear Cuenta
              </button>

          </>
          ) : (
            <>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={registroForm.nombre}
                  onChange={(e) => setRegistroForm({...registroForm, nombre: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registroForm.email}
                  onChange={(e) => setRegistroForm({...registroForm, email: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={registroForm.password}
                  onChange={(e) => setRegistroForm({...registroForm, password: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={registroForm.rol}
                  onChange={(e) => setRegistroForm({...registroForm, rol: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="operador">Operador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
                <select
                  value={registroForm.sucursal}
                  onChange={(e) => setRegistroForm({...registroForm, sucursal: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas las sucursales</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRegistro}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold mt-6"
              >
                Registrar Usuario
              </button>

              <button
                onClick={() => setMostrarRegistro(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold mt-3"
              >
                Volver
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              GRDS
              <span className="text-xs bg-green-500 px-2 py-1 rounded">ONLINE</span>
            </h1>
            <p className="text-sm text-blue-100">Sistema de Gestión de Reclamos</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{usuario?.nombre}</p>
              <p className="text-xs">{usuario?.rol}</p>
            </div>
            <button
              onClick={() => { setUsuario(null); setMostrarLogin(true); setReclamos([]); }}
              className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Panel de Control</h2>
              <p className="text-gray-600">Base de datos en tiempo real</p>
            </div>
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {mostrarFormulario ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {mostrarFormulario ? 'Cancelar' : 'Nuevo Reclamo'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
              <div className="text-2xl font-bold">{reclamos.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-800">
                {reclamos.filter(r => r.estado === 'pendiente').length}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-800">
                {reclamos.filter(r => r.estado === 'en_proceso').length}
              </div>
              <div className="text-sm text-blue-700">En Proceso</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-800">
                {reclamos.filter(r => r.estado === 'resuelto').length}
              </div>
              <div className="text-sm text-green-700">Resueltos</div>
            </div>
          </div>

          {reclamos.length > 0 && (
            <button
              onClick={exportarExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 mb-6"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Exportar Excel
            </button>
          )}

          {mostrarFormulario && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
              <h3 className="font-semibold mb-4 text-lg">Nuevo Reclamo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre Cliente *"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({...formulario, nombre: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={formulario.email}
                  onChange={(e) => setFormulario({...formulario, email: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formulario.telefono}
                  onChange={(e) => setFormulario({...formulario, telefono: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formulario.sucursal}
                  onChange={(e) => setFormulario({...formulario, sucursal: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sucursal *</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <select
                  value={formulario.categoria}
                  onChange={(e) => setFormulario({...formulario, categoria: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                  <option value="facturacion">Facturación</option>
                  <option value="entrega">Entrega</option>
                </select>
                <select
                  value={formulario.urgencia}
                  onChange={(e) => setFormulario({...formulario, urgencia: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baja">🟢 Baja</option>
                  <option value="media">🟡 Media</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="critica">🔴 Crítica</option>
                </select>
                <input
                  type="text"
                  placeholder="Asunto *"
                  value={formulario.asunto}
                  onChange={(e) => setFormulario({...formulario, asunto: e.target.value})}
                  className="md:col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Descripción *"
                  rows="3"
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({...formulario, descripcion: e.target.value})}
                  className="md:col-span-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Registrar Reclamo
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_proceso">En Proceso</option>
              <option value="resuelto">Resueltos</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {reclamosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg">No hay reclamos para mostrar</p>
            </div>
          ) : (
            reclamosFiltrados.map(reclamo => (
              <div key={reclamo.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition" style={{borderLeft: `4px solid ${reclamo.urgencia === 'critica' ? '#dc2626' : reclamo.urgencia === 'alta' ? '#f97316' : reclamo.urgencia === 'media' ? '#facc15' : '#22c55e'}`}}>
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getUrgenciaColor(reclamo.urgencia)}`}>
                        {reclamo.urgencia}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(reclamo.estado)}`}>
                        {reclamo.estado === 'pendiente' ? 'Pendiente' : 
                         reclamo.estado === 'en_proceso' ? 'En Proceso' : 'Resuelto'}
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {reclamo.categoria}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{reclamo.asunto}</h3>
                    <p className="text-gray-600 mb-3">{reclamo.descripcion}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                      <div><span className="font-medium">👤 Cliente:</span> {reclamo.nombre_cliente}</div>
                      <div><span className="font-medium">✉️ Email:</span> {reclamo.email_cliente}</div>
                      {reclamo.telefono_cliente && <div><span className="font-medium">📞 Teléfono:</span> {reclamo.telefono_cliente}</div>}
                      <div><span className="font-medium">📍 Sucursal:</span> {sucursales.find(s => s.id === reclamo.sucursal)?.nombre}</div>
                      <div><span className="font-medium">📅 Fecha:</span> {new Date(reclamo.created_at).toLocaleDateString('es-ES')}</div>
                      <div><span className="font-medium">🆔 ID:</span> #{reclamo.id}</div>
                      <div><span className="font-medium">👨‍💼 Creado:</span> {reclamo.creado_por}</div>
                      {reclamo.asignado_a && <div><span className="font-medium">📌 Asignado:</span> {reclamo.asignado_a}</div>}
                    </div>

                    {reclamo.historial && JSON.parse(reclamo.historial).length > 1 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-600 font-medium hover:text-blue-700">
                          Ver historial ({JSON.parse(reclamo.historial).length} eventos)
                        </summary>
                        <div className="mt-2 bg-gray-50 rounded p-3 space-y-2">
                          {JSON.parse(reclamo.historial).map((evento, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                              <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{evento.accion}</span>
                                <span className="text-gray-400"> • {new Date(evento.fecha).toLocaleString('es-ES')} • {evento.usuario}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 lg:w-48">
                    <select
                      value={reclamo.estado}
                      onChange={(e) => cambiarEstado(reclamo.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                    
                    {(usuario?.rol === 'admin' || usuario?.rol === 'supervisor') && (
                      <select
                        value={reclamo.asignado_a || ''}
                        onChange={(e) => asignarReclamo(reclamo.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.filter(u => u.rol !== 'admin').map(u => (
                          <option key={u.id} value={u.nombre}>{u.nombre}</option>
                        ))}
                      </select>
                    )}
                    
                    {usuario?.rol === 'admin' && (
                      <button
                        onClick={() => eliminarReclamo(reclamo.id)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
