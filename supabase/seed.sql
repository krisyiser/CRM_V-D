-- Vainilla & Descanso CRM — Seed Data

-- Default Rooms
INSERT INTO rooms (id, name, room_type, status, price) VALUES
  ('101', 'Moros y cristianos', 'Suite',    'available', 2300.00),
  ('102', 'El Volador',         'Suite',    'available', 1600.00),
  ('103', 'Guagua',             'Estándar', 'available', 1100.00),
  ('104', 'Negritos',           'Estándar', 'available', 1100.00),
  ('105', 'Santiagueros',       'Suite',    'available', 1600.00);

-- Default Products (Menu)
INSERT INTO products (name, category, price) VALUES
  ('Desayuno Completo Habitación / Restaurante', 'Desayunos',  180.00),
  ('Desayuno Ligero',                            'Desayunos',  120.00),
  ('Latte',                                      'Café',        50.00),
  ('Capuchino',                                  'Café',        45.00),
  ('Americano',                                  'Café',        40.00),
  ('Corona',                                     'Cerveza',     20.00),
  ('Victoria',                                   'Cerveza',     20.00),
  ('Micheladas',                                 'Cerveza',     80.00),
  ('Cheladas',                                   'Cerveza',     70.00),
  ('Michelada con Clamato 500ml',                'Cerveza',     90.00),
  ('Tequila 1800',                               'Copas',      150.00),
  ('Brandy Torres 10',                           'Copas',       90.00),
  ('Brandy Magno',                               'Copas',      100.00),
  ('Ron Zacapa',                                 'Copas',      190.00),
  ('Whisky Red Label',                           'Copas',       90.00),
  ('Whisky Etiqueta Negra',                      'Copas',      150.00),
  ('Mezcal Amaras',                              'Copas',      135.00),
  ('Mezcal 400 Conejos',                         'Copas',      115.00),
  ('Licor 43 Carajillo',                         'Digestivos', 150.00),
  ('Shot Digestivo',                             'Digestivos',  80.00),
  ('Digestivo Preparado',                        'Digestivos', 100.00),
  ('Vino Mariatinto',                            'Vinos',      280.00),
  ('Vino Casa Madero',                           'Vinos',      200.00),
  ('Vino Tablas',                                'Vinos',      150.00),
  ('Agua Botella',                               'Extras',      20.00),
  ('Refresco Coca-Cola',                         'Extras',      30.00),
  ('Palomitas',                                  'Extras',      35.00),
  ('Cigarros Cajetilla',                         'Extras',     110.00);

-- Default Settings
INSERT INTO settings (key, value) VALUES
  ('is_high_season', 'false');

-- Welcome Notification
INSERT INTO notifications (title, message, type) VALUES
  ('Sistema Listo', 'El CRM de Vainilla & Descanso se ha iniciado correctamente.', 'info');
