use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveDevice {
    ip: String,
    device_id: String,
    name: String,
    user_agent: String,
    last_seen: String,
    status: String, // "active" or "blocked"
}

#[derive(Clone)]
struct AppState {
    db: Pool<Sqlite>,
    api_key: String,
    active_devices: Arc<Mutex<Vec<ActiveDevice>>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Room {
    id: String,
    name: String,
    room_type: String,
    status: String,
    price: f64,
    image: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Reservation {
    id: String,
    room_id: String,
    guest_name: String,
    check_in: String,
    check_out: String,
    dates: String,
    total_price: f64,
    status: String,
    external_id: Option<String>,
    notes: Option<String>,
    payment_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Guest {
    id: String,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    id_number: Option<String>,
    origin: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Feedback {
    id: String,
    guest_name: String,
    rating: i32,
    comment: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    id: String,
    name: String,
    category: String,
    price: f64,
    stock: Option<i32>,
    image: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RoomCharge {
    id: String,
    room_id: String,
    guest_name: String,
    items_json: String,
    total: f64,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PosSale {
    id: String,
    items_json: String,
    total: f64,
    payment_method: String,
    notes: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    id: String,
    title: String,
    message: String,
    #[sqlx(rename = "type")]
    type_: String, // info, warning, success
    timestamp: String,
    read: bool,
}

#[derive(Debug, Deserialize)]
struct ExternalReservation {
    room_id: String,
    guest_name: String,
    check_in: String,
    check_out: String,
    total_price: f64,
}

// --- DB Initialization ---
async fn init_db(app_handle: &AppHandle) -> Result<Pool<Sqlite>, sqlx::Error> {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).ok();
    let db_path = app_dir.join("vainilla.db");
    use sqlx::sqlite::SqliteConnectOptions;
    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            room_type TEXT NOT NULL,
            status TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            guest_id TEXT,
            guest_name TEXT NOT NULL,
            check_in TEXT NOT NULL,
            check_out TEXT NOT NULL,
            total_price REAL NOT NULL,
            notes TEXT,
            payment_status TEXT NOT NULL DEFAULT 'paid',
            status TEXT NOT NULL,
            external_id TEXT,
            FOREIGN KEY(room_id) REFERENCES rooms(id)
        )",
    )
    .execute(&pool)
    .await?;

    let _ = sqlx::query("ALTER TABLE reservations ADD COLUMN guest_id TEXT").execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE reservations ADD COLUMN notes TEXT").execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE reservations ADD COLUMN payment_status TEXT DEFAULT 'paid'").execute(&pool).await;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            read BOOLEAN NOT NULL DEFAULT 0
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS guests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            id_number TEXT,
            origin TEXT,
            created_at TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            guest_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER,
            image TEXT,
            created_at TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS pos_sales (
            id TEXT PRIMARY KEY,
            items_json TEXT NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS room_charges (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            guest_name TEXT NOT NULL,
            items_json TEXT NOT NULL,
            total REAL NOT NULL,
            created_at TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;
    
    // Seed default products if empty
    let prod_count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM products")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    if prod_count.0 == 0 {
        let initial_products = vec![
            ("Desayuno Completo Habitación / Restaurante", "Desayunos", 180.0),
            ("Desayuno Ligero", "Desayunos", 120.0),
            ("Latte", "Café", 50.0),
            ("Capuchino", "Café", 45.0),
            ("Americano", "Café", 40.0),
            ("Corona", "Cerveza", 20.0),
            ("Victoria", "Cerveza", 20.0),
            ("Micheladas", "Cerveza", 80.0),
            ("Cheladas", "Cerveza", 70.0),
            ("Michelada con Clamato 500ml", "Cerveza", 90.0),
            ("Tequila 1800", "Copas", 150.0),
            ("Brandy Torres 10", "Copas", 90.0),
            ("Brandy Magno", "Copas", 100.0),
            ("Ron Zacapa", "Copas", 190.0),
            ("Whisky Red Label", "Copas", 90.0),
            ("Whisky Etiqueta Negra", "Copas", 150.0),
            ("Mezcal Amaras", "Copas", 135.0),
            ("Mezcal 400 Conejos", "Copas", 115.0),
            ("Licor 43 Carajillo", "Digestivos", 150.0),
            ("Shot Digestivo", "Digestivos", 80.0),
            ("Digestivo Preparado", "Digestivos", 100.0),
            ("Vino Mariatinto", "Vinos", 280.0),
            ("Vino Casa Madero", "Vinos", 200.0),
            ("Vino Tablas", "Vinos", 150.0),
            ("Agua Botella", "Extras", 20.0),
            ("Refresco Coca-Cola", "Extras", 30.0),
            ("Palomitas", "Extras", 35.0),
            ("Cigarros Cajetilla", "Extras", 110.0),
        ];

        for (name, cat, pr) in initial_products {
            let pid = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            let _ = sqlx::query("INSERT INTO products (id, name, category, price, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(pid)
                .bind(name)
                .bind(cat)
                .bind(pr)
                .bind(now)
                .execute(&pool)
                .await;
        }
    }
    
    sqlx::query("INSERT OR IGNORE INTO settings (key, value) VALUES ('is_high_season', 'false')").execute(&pool).await?;
    sqlx::query("INSERT OR IGNORE INTO settings (key, value) VALUES ('api_key', 'vnl_' || hex(randomblob(16)))").execute(&pool).await?;

    // Initial Notifications
    let note_count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM notifications")
        .fetch_one(&pool)
        .await?;

    if note_count.0 == 0 {
        sqlx::query("INSERT INTO notifications (id, title, message, type, timestamp, read) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("Sistema Listo")
            .bind("El dashboard de Vainilla & Descanso se ha iniciado correctamente.")
            .bind("info")
            .bind("Ahora")
            .bind(false)
            .execute(&pool)
            .await?;
    }

    // Insert default rooms if empty
    let room_count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM rooms")
        .fetch_one(&pool)
        .await?;

    if room_count.0 == 0 {
        let rooms = vec![
            ("101", "Moros y cristianos", "Suite", "available", 2300.0),
            ("102", "El Volador", "Suite", "available", 1600.0),
            ("103", "Guagua", "Estándar", "available", 1100.0),
            ("104", "Negritos", "Estándar", "available", 1100.0),
            ("105", "Santiagueros", "Suite", "available", 1600.0),
        ];

        for (id, name, rtype, status, price) in rooms {
            sqlx::query("INSERT INTO rooms (id, name, room_type, status, price) VALUES (?, ?, ?, ?, ?)")
                .bind(id)
                .bind(name)
                .bind(rtype)
                .bind(status)
                .bind(price)
                .execute(&pool)
                .await?;
        }
    }

    Ok(pool)
}

async fn get_or_create_api_key(pool: &Pool<Sqlite>) -> String {
    let result: Option<(String,)> = sqlx::query_as("SELECT value FROM settings WHERE key = 'api_key'")
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

    match result {
        Some((key,)) => key,
        None => {
            let new_key = Uuid::new_v4().to_string();
            sqlx::query("INSERT INTO settings (key, value) VALUES ('api_key', ?)")
                .bind(&new_key)
                .execute(pool)
                .await
                .ok();
            new_key
        }
    }
}

// --- Axum Handlers ---
#[axum::debug_handler]
async fn handle_external_reservation(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ExternalReservation>,
) -> impl IntoResponse {
    let auth_header = headers.get("X-API-KEY").and_then(|h| h.to_str().ok());

    if auth_header != Some(&state.api_key) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid API Key" })),
        );
    }

    let id = Uuid::new_v4().to_string();
    
    // Auto-register corresponding guest in guests table if they do not exist
    let guest_name = payload.guest_name.trim().to_string();
    let guest_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let existing_guest = sqlx::query("SELECT id FROM guests WHERE name = ?")
        .bind(&guest_name)
        .fetch_optional(&state.db)
        .await;

    let final_guest_id = match existing_guest {
        Ok(Some(row)) => {
            use sqlx::Row;
            row.get::<String, _>("id")
        }
        _ => {
            let _ = sqlx::query(
                "INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&guest_id)
            .bind(&guest_name)
            .bind(None::<String>)
            .bind(None::<String>)
            .bind(None::<String>)
            .bind("Sitio Web")
            .bind(&now)
            .execute(&state.db)
            .await;
            guest_id
        }
    };

    let result = sqlx::query(
        "INSERT INTO reservations (id, room_id, guest_id, guest_name, check_in, check_out, total_price, status, external_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.room_id)
    .bind(Some(final_guest_id))
    .bind(&guest_name)
    .bind(&payload.check_in)
    .bind(&payload.check_out)
    .bind(payload.total_price)
    .bind("Confirmed")
    .bind(Some(id.clone()))
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "status": "success", "reservation_id": id })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

async fn handle_get_settings(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if !validate_api_key(&headers, &state.db).await {
        return (StatusCode::UNAUTHORIZED, "Invalid API Key").into_response();
    }

    match sqlx::query_as::<_, Setting>("SELECT * FROM settings").fetch_all(&state.db).await {
        Ok(settings) => {
            let mut map = serde_json::Map::new();
            for s in settings {
                map.insert(s.key, serde_json::Value::String(s.value));
            }
            Json(serde_json::Value::Object(map)).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_rooms(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match sqlx::query_as::<_, Room>("SELECT * FROM rooms").fetch_all(&state.db).await {
        Ok(rooms) => Json(rooms).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_notifications(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match sqlx::query_as::<_, Notification>("SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50").fetch_all(&state.db).await {
        Ok(notes) => Json(notes).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn validate_api_key(headers: &HeaderMap, db: &Pool<Sqlite>) -> bool {
    if let Some(key) = headers.get("X-API-KEY") {
        if let Ok(key_str) = key.to_str() {
            let res = sqlx::query("SELECT value FROM settings WHERE key = 'api_key' AND value = ?")
                .bind(key_str)
                .fetch_optional(db)
                .await;
            return res.is_ok() && res.as_ref().unwrap().is_some();
        }
    }
    false
}


// Helper to check if a device is blocked
fn is_device_blocked(state: &AppState, headers: &HeaderMap) -> bool {
    if let Some(device_id_header) = headers.get("X-Device-Id") {
        if let Ok(device_id) = device_id_header.to_str() {
            let devices = state.active_devices.lock().unwrap();
            return devices.iter().any(|d| d.device_id == device_id && d.status == "blocked");
        }
    }
    false
}

// Handlers for POS Network Devices
async fn handle_get_devices(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let mut devices = state.active_devices.lock().unwrap();
    let now = chrono::Utc::now();
    
    // Dynamically mark devices as "offline" if they haven't sent a heartbeat in the last 45 seconds
    for device in devices.iter_mut() {
        if device.status == "active" {
            if let Ok(last_seen_time) = chrono::DateTime::parse_from_rfc3339(&device.last_seen) {
                let duration = now.signed_duration_since(last_seen_time.with_timezone(&chrono::Utc));
                if duration.num_seconds() > 45 {
                    device.status = "offline".to_string();
                }
            }
        }
    }
    Json(devices.clone()).into_response()
}

#[derive(Debug, Deserialize)]
struct DeleteDevicePayload {
    device_id: String,
}

async fn handle_delete_device(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeleteDevicePayload>,
) -> impl IntoResponse {
    let mut devices = state.active_devices.lock().unwrap();
    if let Some(pos) = devices.iter().position(|d| d.device_id == payload.device_id) {
        devices.remove(pos);
        (StatusCode::OK, "Device removed successfully").into_response()
    } else {
        (StatusCode::NOT_FOUND, "Device not found").into_response()
    }
}

async fn handle_health() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok", "version": "1.0.0" })))
}

#[derive(Debug, Deserialize)]
struct RegisterDevicePayload {
    device_id: String,
    name: String,
    user_agent: String,
}

async fn handle_register_device(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterDevicePayload>,
) -> impl IntoResponse {
    let mut devices = state.active_devices.lock().unwrap();
    let ip = headers.get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    
    // Check if device is blocked before allowing register
    if devices.iter().any(|d| d.device_id == payload.device_id && d.status == "blocked") {
        return (StatusCode::UNAUTHORIZED, "Este dispositivo ha sido desvinculado por el Administrador.").into_response();
    }

    let now = chrono::Utc::now().to_rfc3339();

    // Check if exists
    if let Some(device) = devices.iter_mut().find(|d| d.device_id == payload.device_id) {
        device.last_seen = now;
        device.name = payload.name;
        device.ip = ip;
        // Restore status to active if they were previously offline
        if device.status == "offline" {
            device.status = "active".to_string();
        }
        Json(device.clone()).into_response()
    } else {
        let new_device = ActiveDevice {
            ip,
            device_id: payload.device_id,
            name: payload.name,
            user_agent: payload.user_agent,
            last_seen: now,
            status: "active".to_string(),
        };
        devices.push(new_device.clone());
        Json(new_device).into_response()
    }
}

#[derive(Debug, Deserialize)]
struct BlockDevicePayload {
    device_id: String,
    blocked: bool,
}

async fn handle_block_device(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BlockDevicePayload>,
) -> impl IntoResponse {
    let mut devices = state.active_devices.lock().unwrap();
    if let Some(device) = devices.iter_mut().find(|d| d.device_id == payload.device_id) {
        device.status = if payload.blocked { "blocked".to_string() } else { "active".to_string() };
        Json(device.clone()).into_response()
    } else {
        (StatusCode::NOT_FOUND, "Device not found").into_response()
    }
}

// Handlers for POS and Products over network
async fn handle_get_reservations(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, room_id, guest_name, check_in, check_out, total_price, status, external_id, notes, payment_status FROM reservations"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let reservations: Vec<Reservation> = rows.into_iter().map(|row| {
                use sqlx::Row;
                let check_in: String = row.get("check_in");
                let check_out: String = row.get("check_out");
                Reservation {
                    id: row.get("id"),
                    room_id: row.get("room_id"),
                    guest_name: row.get("guest_name"),
                    check_in: check_in.clone(),
                    check_out: check_out.clone(),
                    dates: format!("{} - {}", check_in, check_out),
                    total_price: row.get("total_price"),
                    status: row.get("status"),
                    external_id: row.get("external_id"),
                    notes: row.get("notes"),
                    payment_status: row.get("payment_status"),
                }
            }).collect();
            Json(reservations).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_products(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, name, category, price, stock, image, created_at FROM products ORDER BY category, name"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Product> = rows.into_iter().map(|row| {
                use sqlx::Row;
                Product {
                    id: row.get("id"),
                    name: row.get("name"),
                    category: row.get("category"),
                    price: row.get("price"),
                    stock: row.get("stock"),
                    image: row.get("image"),
                    created_at: row.get("created_at"),
                }
            }).collect();
            Json(items).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct AddProductPayload {
    name: String,
    category: String,
    price: f64,
    stock: Option<i32>,
    image: Option<String>,
}

async fn handle_add_product(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddProductPayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO products (id, name, category, price, stock, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.category)
    .bind(payload.price)
    .bind(payload.stock)
    .bind(&payload.image)
    .bind(&now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(Product {
            id,
            name: payload.name,
            category: payload.category,
            price: payload.price,
            stock: payload.stock,
            image: payload.image,
            created_at: now,
        }).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct DeletePayload {
    id: String,
}

async fn handle_delete_product(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeletePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let result = sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(payload.id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_pos_sales(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, items_json, total, payment_method, notes, created_at FROM pos_sales ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<PosSale> = rows.into_iter().map(|row| {
                use sqlx::Row;
                PosSale {
                    id: row.get("id"),
                    items_json: row.get("items_json"),
                    total: row.get("total"),
                    payment_method: row.get("payment_method"),
                    notes: row.get("notes"),
                    created_at: row.get("created_at"),
                }
            }).collect();
            Json(items).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct AddPosSalePayload {
    #[serde(alias = "items_json", alias = "itemsJson")]
    items_json: String,
    total: f64,
    #[serde(alias = "payment_method", alias = "paymentMethod")]
    payment_method: String,
    notes: Option<String>,
}

async fn handle_add_pos_sale(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddPosSalePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO pos_sales (id, items_json, total, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.items_json)
    .bind(payload.total)
    .bind(&payload.payment_method)
    .bind(&payload.notes)
    .bind(&now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(PosSale {
            id,
            items_json: payload.items_json,
            total: payload.total,
            payment_method: payload.payment_method,
            notes: payload.notes,
            created_at: now,
        }).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct UpdatePosSalePayload {
    id: String,
    #[serde(alias = "items_json", alias = "itemsJson")]
    items_json: String,
    total: f64,
    #[serde(alias = "payment_method", alias = "paymentMethod")]
    payment_method: String,
    notes: Option<String>,
}

async fn handle_update_pos_sale(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdatePosSalePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let result = sqlx::query(
        "UPDATE pos_sales SET items_json = ?, total = ?, payment_method = ?, notes = ? WHERE id = ?"
    )
    .bind(&payload.items_json)
    .bind(payload.total)
    .bind(&payload.payment_method)
    .bind(&payload.notes)
    .bind(&payload.id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let row = sqlx::query(
                "SELECT id, items_json, total, payment_method, notes, created_at FROM pos_sales WHERE id = ?"
            )
            .bind(&payload.id)
            .fetch_one(&state.db)
            .await;

            match row {
                Ok(row) => {
                    use sqlx::Row;
                    Json(PosSale {
                        id: row.get("id"),
                        items_json: row.get("items_json"),
                        total: row.get("total"),
                        payment_method: row.get("payment_method"),
                        notes: row.get("notes"),
                        created_at: row.get("created_at"),
                    }).into_response()
                },
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_delete_pos_sale(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeletePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let result = sqlx::query("DELETE FROM pos_sales WHERE id = ?")
        .bind(payload.id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct AddGuestPayload {
    name: String,
    email: Option<String>,
    phone: Option<String>,
    #[serde(alias = "id_number", alias = "idNumber")]
    id_number: Option<String>,
    origin: Option<String>,
}

async fn handle_get_guests(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, name, email, phone, id_number, origin, created_at FROM guests ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let guests: Vec<Guest> = rows.into_iter().map(|row| {
                use sqlx::Row;
                Guest {
                    id: row.get("id"),
                    name: row.get("name"),
                    email: row.get("email"),
                    phone: row.get("phone"),
                    id_number: row.get("id_number"),
                    origin: row.get("origin"),
                    created_at: row.get("created_at"),
                }
            }).collect();
            Json(guests).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_add_guest(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddGuestPayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let name = payload.name.trim().to_string();
    let email = payload.email.as_ref().map(|s| s.trim().to_string());
    let phone = payload.phone.as_ref().map(|s| s.trim().to_string());
    let id_number = payload.id_number.as_ref().map(|s| s.trim().to_string());
    let origin = payload.origin.as_ref().map(|s| s.trim().to_string());

    let existing_guest = sqlx::query("SELECT id, name, email, phone, id_number, origin, created_at FROM guests WHERE name = ?")
        .bind(&name)
        .fetch_optional(&state.db)
        .await;

    match existing_guest {
        Ok(Some(row)) => {
            use sqlx::Row;
            let existing_id = row.get::<String, _>("id");

            // Update details
            let mut update_query = String::from("UPDATE guests SET name = name");
            if email.is_some() { update_query.push_str(", email = ?"); }
            if phone.is_some() { update_query.push_str(", phone = ?"); }
            if id_number.is_some() { update_query.push_str(", id_number = ?"); }
            if origin.is_some() { update_query.push_str(", origin = ?"); }
            update_query.push_str(" WHERE id = ?");

            let mut q = sqlx::query(&update_query);
            if let Some(ref e) = email { q = q.bind(e); }
            if let Some(ref p) = phone { q = q.bind(p); }
            if let Some(ref id_n) = id_number { q = q.bind(id_n); }
            if let Some(ref o) = origin { q = q.bind(o); }
            q = q.bind(&existing_id);

            let _ = q.execute(&state.db).await;

            // Fetch the updated guest to return
            if let Ok(updated) = sqlx::query("SELECT id, name, email, phone, id_number, origin, created_at FROM guests WHERE id = ?")
                .bind(&existing_id)
                .fetch_one(&state.db)
                .await
            {
                return Json(serde_json::json!({
                    "id": updated.get::<String, _>("id"),
                    "name": updated.get::<String, _>("name"),
                    "email": updated.get::<Option<String>, _>("email"),
                    "phone": updated.get::<Option<String>, _>("phone"),
                    "id_number": updated.get::<Option<String>, _>("id_number"),
                    "origin": updated.get::<Option<String>, _>("origin"),
                    "created_at": updated.get::<String, _>("created_at")
                })).into_response();
            }

            return Json(serde_json::json!({
                "id": row.get::<String, _>("id"),
                "name": row.get::<String, _>("name"),
                "email": row.get::<Option<String>, _>("email"),
                "phone": row.get::<Option<String>, _>("phone"),
                "id_number": row.get::<Option<String>, _>("id_number"),
                "origin": row.get::<Option<String>, _>("origin"),
                "created_at": row.get::<String, _>("created_at")
            })).into_response();
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        _ => {}
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&email)
    .bind(&phone)
    .bind(&id_number)
    .bind(&origin)
    .bind(&now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "id": id,
            "name": name,
            "email": email,
            "phone": phone,
            "id_number": id_number,
            "origin": origin,
            "created_at": now
        })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_delete_guest(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeletePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let result = sqlx::query("DELETE FROM guests WHERE id = ?")
        .bind(payload.id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct AddFeedbackPayload {
    #[serde(alias = "guest_name", alias = "guestName")]
    guest_name: String,
    rating: i32,
    comment: String,
}

async fn handle_get_feedback(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, guest_name, rating, comment, created_at FROM feedback ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Feedback> = rows.into_iter().map(|row| {
                use sqlx::Row;
                Feedback {
                    id: row.get("id"),
                    guest_name: row.get("guest_name"),
                    rating: row.get("rating"),
                    comment: row.get("comment"),
                    created_at: row.get("created_at"),
                }
            }).collect();
            Json(items).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_add_feedback(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddFeedbackPayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO feedback (id, guest_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.guest_name)
    .bind(payload.rating)
    .bind(&payload.comment)
    .bind(&now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "id": id,
            "guest_name": payload.guest_name,
            "rating": payload.rating,
            "comment": payload.comment,
            "created_at": now
        })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_delete_feedback(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeletePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let result = sqlx::query("DELETE FROM feedback WHERE id = ?")
        .bind(payload.id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_room_charges(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let rows = sqlx::query(
        "SELECT id, room_id, guest_name, items_json, total, created_at FROM room_charges ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<RoomCharge> = rows.into_iter().map(|row| {
                use sqlx::Row;
                RoomCharge {
                    id: row.get("id"),
                    room_id: row.get("room_id"),
                    guest_name: row.get("guest_name"),
                    items_json: row.get("items_json"),
                    total: row.get("total"),
                    created_at: row.get("created_at"),
                }
            }).collect();
            Json(items).into_response()
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Deserialize)]
struct AddRoomChargePayload {
    #[serde(alias = "room_id", alias = "roomId")]
    room_id: String,
    #[serde(alias = "guest_name", alias = "guestName")]
    guest_name: String,
    #[serde(alias = "items_json", alias = "itemsJson")]
    items_json: String,
    total: f64,
}

async fn handle_add_room_charge(
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddRoomChargePayload>,
) -> impl IntoResponse {
    if is_device_blocked(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, "Dispositivo desvinculado").into_response();
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO room_charges (id, room_id, guest_name, items_json, total, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.room_id)
    .bind(&payload.guest_name)
    .bind(&payload.items_json)
    .bind(payload.total)
    .bind(&now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(RoomCharge {
            id,
            room_id: payload.room_id,
            guest_name: payload.guest_name,
            items_json: payload.items_json,
            total: payload.total,
            created_at: now,
        }).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// --- Tauri Commands ---
#[tauri::command]
async fn get_rooms(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Room>, String> {
    sqlx::query_as::<_, Room>("SELECT id, name, room_type, status, price, image FROM rooms")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_reservations(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Reservation>, String> {
    let rows = sqlx::query(
        "SELECT id, room_id, guest_name, check_in, check_out, total_price, status, external_id, notes, payment_status FROM reservations"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let reservations = rows.into_iter().map(|row| {
        use sqlx::Row;
        let check_in: String = row.get("check_in");
        let check_out: String = row.get("check_out");
        Reservation {
            id: row.get("id"),
            room_id: row.get("room_id"),
            guest_name: row.get("guest_name"),
            check_in: check_in.clone(),
            check_out: check_out.clone(),
            dates: format!("{} - {}", check_in, check_out),
            total_price: row.get("total_price"),
            status: row.get("status"),
            external_id: row.get("external_id"),
            notes: row.get("notes"),
            payment_status: row.get("payment_status"),
        }
    }).collect();

    Ok(reservations)
}

#[tauri::command]
async fn update_room_status(state: tauri::State<'_, Arc<AppState>>, id: String, status: String) -> Result<(), String> {
    sqlx::query("UPDATE rooms SET status = ? WHERE id = ?")
        .bind(status)
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_reservation(
    state: tauri::State<'_, Arc<AppState>>,
    guest_id: Option<String>,
    room_id: String,
    guest_name: String,
    dates: String,
    notes: Option<String>,
    payment_status: Option<String>,
    total_price: Option<f64>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let guest_name = guest_name.trim().to_string();
    
    let parts: Vec<&str> = dates.split(" - ").collect();
    let check_in = parts.get(0).unwrap_or(&"").to_string();
    let check_out = parts.get(1).unwrap_or(&"").to_string();

    let price = total_price.unwrap_or(0.0);
    let pstatus = payment_status.unwrap_or_else(|| "paid".to_string());

    // 1. Resolve or auto-register guest in the guests table
    let final_guest_id = if let Some(ref gid) = guest_id {
        if gid.is_empty() {
            None
        } else {
            Some(gid.clone())
        }
    } else {
        None
    };

    let resolved_guest_id = match final_guest_id {
        Some(gid) => {
            // Check if guest with this ID exists
            let exists = sqlx::query("SELECT id FROM guests WHERE id = ?")
                .bind(&gid)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| e.to_string())?;

            if exists.is_none() {
                // If not, see if name exists
                let by_name = sqlx::query("SELECT id FROM guests WHERE name = ?")
                    .bind(&guest_name)
                    .fetch_optional(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;

                if let Some(row) = by_name {
                    use sqlx::Row;
                    row.get::<String, _>("id")
                } else {
                    // Create guest with the provided ID
                    let now = chrono::Utc::now().to_rfc3339();
                    sqlx::query(
                        "INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    )
                    .bind(&gid)
                    .bind(&guest_name)
                    .bind(None::<String>)
                    .bind(None::<String>)
                    .bind("N/A")
                    .bind("Lobby")
                    .bind(&now)
                    .execute(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;
                    gid
                }
            } else {
                gid
            }
        }
        None => {
            // Check if guest with this name already exists
            let by_name = sqlx::query("SELECT id FROM guests WHERE name = ?")
                .bind(&guest_name)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| e.to_string())?;

            if let Some(row) = by_name {
                use sqlx::Row;
                row.get::<String, _>("id")
            } else {
                // Create a brand new guest
                let new_gid = Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();
                sqlx::query(
                    "INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&new_gid)
                .bind(&guest_name)
                .bind(None::<String>)
                .bind(None::<String>)
                .bind("N/A")
                .bind("Lobby")
                .bind(&now)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
                new_gid
            }
        }
    };

    // 2. Insert the reservation linking it to the resolved guest ID
    sqlx::query(
        "INSERT INTO reservations (id, room_id, guest_id, guest_name, check_in, check_out, total_price, notes, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&room_id)
    .bind(Some(resolved_guest_id))
    .bind(&guest_name)
    .bind(&check_in)
    .bind(&check_out)
    .bind(price)
    .bind(&notes)
    .bind(&pstatus)
    .bind("Confirmed")
    .execute(&state.db)
    .await
    .map(|_| id)
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_reservation(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM reservations WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let settings = sqlx::query_as::<_, Setting>("SELECT * FROM settings")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut map = serde_json::Map::new();
    for s in settings {
        map.insert(s.key, serde_json::Value::String(s.value));
    }
    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
async fn get_notifications(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Notification>, String> {
    sqlx::query_as::<_, Notification>("SELECT * FROM notifications ORDER BY timestamp DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_setting(state: tauri::State<'_, Arc<AppState>>, key: String, value: String) -> Result<(), String> {
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(key)
        .bind(value)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_api_key(state: tauri::State<'_, Arc<AppState>>) -> Result<String, String> {
    Ok(state.api_key.clone())
}

#[tauri::command]
async fn get_guests(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Guest>, String> {
    let rows = sqlx::query(
        "SELECT id, name, email, phone, id_number, origin, created_at FROM guests ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let guests = rows.into_iter().map(|row| {
        use sqlx::Row;
        Guest {
            id: row.get("id"),
            name: row.get("name"),
            email: row.get("email"),
            phone: row.get("phone"),
            id_number: row.get("id_number"),
            origin: row.get("origin"),
            created_at: row.get("created_at"),
        }
    }).collect();

    Ok(guests)
}

#[tauri::command]
async fn add_guest(
    state: tauri::State<'_, Arc<AppState>>,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    id_number: Option<String>,
    origin: Option<String>,
) -> Result<serde_json::Value, String> {
    let name = name.trim().to_string();
    let email = email.as_ref().map(|s| s.trim().to_string());
    let phone = phone.as_ref().map(|s| s.trim().to_string());
    let id_number = id_number.as_ref().map(|s| s.trim().to_string());
    let origin = origin.as_ref().map(|s| s.trim().to_string());

    let existing_guest = sqlx::query("SELECT id, name, email, phone, id_number, origin, created_at FROM guests WHERE name = ?")
        .bind(&name)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = existing_guest {
        use sqlx::Row;
        let existing_id = row.get::<String, _>("id");

        // Update details
        let mut update_query = String::from("UPDATE guests SET name = name");
        if email.is_some() { update_query.push_str(", email = ?"); }
        if phone.is_some() { update_query.push_str(", phone = ?"); }
        if id_number.is_some() { update_query.push_str(", id_number = ?"); }
        if origin.is_some() { update_query.push_str(", origin = ?"); }
        update_query.push_str(" WHERE id = ?");

        let mut q = sqlx::query(&update_query);
        if let Some(ref e) = email { q = q.bind(e); }
        if let Some(ref p) = phone { q = q.bind(p); }
        if let Some(ref id_n) = id_number { q = q.bind(id_n); }
        if let Some(ref o) = origin { q = q.bind(o); }
        q = q.bind(&existing_id);

        let _ = q.execute(&state.db).await;

        // Fetch the updated guest to return
        let updated = sqlx::query("SELECT id, name, email, phone, id_number, origin, created_at FROM guests WHERE id = ?")
            .bind(&existing_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| e.to_string())?;

        return Ok(serde_json::json!({
            "id": updated.get::<String, _>("id"),
            "name": updated.get::<String, _>("name"),
            "email": updated.get::<Option<String>, _>("email"),
            "phone": updated.get::<Option<String>, _>("phone"),
            "id_number": updated.get::<Option<String>, _>("id_number"),
            "origin": updated.get::<Option<String>, _>("origin"),
            "created_at": updated.get::<String, _>("created_at")
        }));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO guests (id, name, email, phone, id_number, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&email)
    .bind(&phone)
    .bind(&id_number)
    .bind(&origin)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "email": email,
        "phone": phone,
        "id_number": id_number,
        "origin": origin,
        "created_at": now
    }))
}

#[tauri::command]
async fn delete_guest(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM guests WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_feedback(
    state: tauri::State<'_, Arc<AppState>>,
    guest_name: String,
    rating: i32,
    comment: String,
) -> Result<serde_json::Value, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO feedback (id, guest_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&guest_name)
    .bind(rating)
    .bind(&comment)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "guest_name": guest_name,
        "rating": rating,
        "comment": comment,
        "created_at": now
    }))
}

#[tauri::command]
async fn get_feedback(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Feedback>, String> {
    let rows = sqlx::query(
        "SELECT id, guest_name, rating, comment, created_at FROM feedback ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|row| {
        use sqlx::Row;
        Feedback {
            id: row.get("id"),
            guest_name: row.get("guest_name"),
            rating: row.get("rating"),
            comment: row.get("comment"),
            created_at: row.get("created_at"),
        }
    }).collect();

    Ok(items)
}

#[tauri::command]
async fn delete_feedback(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    println!("Rust delete_feedback called with ID: '{}'", id);
    let result = sqlx::query("DELETE FROM feedback WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            println!("DELETE feedback failed: {}", e);
            e.to_string()
        })?;
    println!("Rows affected by delete_feedback: {}", result.rows_affected());
    Ok(())
}


#[tauri::command]
async fn get_products(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<Product>, String> {
    let rows = sqlx::query(
        "SELECT id, name, category, price, stock, image, created_at FROM products ORDER BY category, name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|row| {
        use sqlx::Row;
        Product {
            id: row.get("id"),
            name: row.get("name"),
            category: row.get("category"),
            price: row.get("price"),
            stock: row.get("stock"),
            image: row.get("image"),
            created_at: row.get("created_at"),
        }
    }).collect();

    Ok(items)
}

#[tauri::command]
async fn add_product(
    state: tauri::State<'_, Arc<AppState>>,
    name: String,
    category: String,
    price: f64,
    stock: Option<i32>,
    image: Option<String>,
) -> Result<Product, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO products (id, name, category, price, stock, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&category)
    .bind(price)
    .bind(stock)
    .bind(&image)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Product {
        id,
        name,
        category,
        price,
        stock,
        image,
        created_at: now,
    })
}

#[tauri::command]
async fn delete_product(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_pos_sale(
    state: tauri::State<'_, Arc<AppState>>,
    items_json: String,
    total: f64,
    payment_method: String,
    notes: Option<String>,
) -> Result<PosSale, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO pos_sales (id, items_json, total, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&items_json)
    .bind(total)
    .bind(&payment_method)
    .bind(&notes)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PosSale {
        id,
        items_json,
        total,
        payment_method,
        notes,
        created_at: now,
    })
}

#[tauri::command]
async fn delete_pos_sale(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM pos_sales WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_pos_sale(
    state: tauri::State<'_, Arc<AppState>>,
    id: String,
    items_json: String,
    total: f64,
    payment_method: String,
    notes: Option<String>,
) -> Result<PosSale, String> {
    sqlx::query(
        "UPDATE pos_sales SET items_json = ?, total = ?, payment_method = ?, notes = ? WHERE id = ?"
    )
    .bind(&items_json)
    .bind(total)
    .bind(&payment_method)
    .bind(&notes)
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    // Fetch updated record
    let row = sqlx::query(
        "SELECT id, items_json, total, payment_method, notes, created_at FROM pos_sales WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(PosSale {
        id: row.get("id"),
        items_json: row.get("items_json"),
        total: row.get("total"),
        payment_method: row.get("payment_method"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
async fn get_pos_sales(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<PosSale>, String> {
    let rows = sqlx::query(
        "SELECT id, items_json, total, payment_method, notes, created_at FROM pos_sales ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|row| {
        use sqlx::Row;
        PosSale {
            id: row.get("id"),
            items_json: row.get("items_json"),
            total: row.get("total"),
            payment_method: row.get("payment_method"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
        }
    }).collect();

    Ok(items)
}

#[tauri::command]
async fn add_room_charge(
    state: tauri::State<'_, Arc<AppState>>,
    room_id: String,
    guest_name: String,
    items_json: String,
    total: f64,
) -> Result<RoomCharge, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO room_charges (id, room_id, guest_name, items_json, total, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&room_id)
    .bind(&guest_name)
    .bind(&items_json)
    .bind(total)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(RoomCharge {
        id,
        room_id,
        guest_name,
        items_json,
        total,
        created_at: now,
    })
}

#[tauri::command]
async fn get_room_charges(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<RoomCharge>, String> {
    let rows = sqlx::query(
        "SELECT id, room_id, guest_name, items_json, total, created_at FROM room_charges ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|row| {
        use sqlx::Row;
        RoomCharge {
            id: row.get("id"),
            room_id: row.get("room_id"),
            guest_name: row.get("guest_name"),
            items_json: row.get("items_json"),
            total: row.get("total"),
            created_at: row.get("created_at"),
        }
    }).collect();

    Ok(items)
}

#[tauri::command]
async fn start_cloud_tunnel() -> Result<String, String> {
    use tokio::process::Command;
    use std::process::Stdio;
    use tokio::io::AsyncBufReadExt;

    // Terminate any existing cloudflared process before starting a new one to avoid leaks or conflicts
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/IM", "cloudflared.exe"])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("killall")
            .arg("cloudflared")
            .output();
    }

    let npx_cmd = if cfg!(target_os = "windows") { "npx.cmd" } else { "npx" };

    let mut child = Command::new(npx_cmd)
        .arg("-y")
        .arg("cloudflared")
        .arg("tunnel")
        .arg("--url")
        .arg("http://localhost:3001")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn cloudflared: {}", e))?;

    let stderr = child.stderr.take().ok_or("No stderr")?;
    let mut reader = tokio::io::BufReader::new(stderr).lines();

    for _ in 0..50 {
        if let Ok(Some(line)) = reader.next_line().await {
            println!("cloudflared: {}", line);
            if let Some(idx) = line.find("https://") {
                let part = &line[idx..];
                let end = part.find(|c: char| c.is_whitespace() || c == '|').unwrap_or(part.len());
                let url = &part[..end];
                if url.contains(".trycloudflare.com") {
                    return Ok(url.to_string());
                }
            }
        }
    }

    Err("Could not extract Cloudflare tunnel URL within timeout".into())
}

#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0")
        .map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80")
        .map_err(|e| e.to_string())?;
    let ip = socket.local_addr()
        .map(|addr| addr.ip().to_string())
        .map_err(|e| e.to_string())?;
    Ok(ip)
}

#[tauri::command]
fn restart_app(app_handle: tauri::AppHandle) {
    tauri::process::restart(&app_handle.env());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Initialize DB synchronously to ensure state is ready for early invokes
            let pool = tauri::async_runtime::block_on(async {
                init_db(&app_handle).await.expect("Failed to initialize database")
            });
            
            let api_key = tauri::async_runtime::block_on(async {
                get_or_create_api_key(&pool).await
            });
            
            let state = Arc::new(AppState {
                db: pool,
                api_key,
                active_devices: Arc::new(std::sync::Mutex::new(Vec::new())),
            });
 
            app.manage(state.clone());
 
            // Spawn background server
            // Resolve static frontend dir: in dev use ../out relative to manifest, in prod use resource dir
            let frontend_dir = {
                // Try to find the 'out' directory (Next.js static export)
                let candidates = vec![
                    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../out"),
                    app_handle.path().resource_dir().unwrap_or_default().join("_up_/out"),
                    app_handle.path().resource_dir().unwrap_or_default().join("out"),
                    std::env::current_exe().ok().and_then(|p| p.parent().map(|pp| pp.join("../Resources/out"))).unwrap_or_default(),
                    std::env::current_exe().ok().and_then(|p| p.parent().map(|pp| pp.join("../Resources/_up_/out"))).unwrap_or_default(),
                ];
                candidates.into_iter().find(|p| p.exists() && (p.join("index.html").exists() || p.join("pos.html").exists()))
                    .unwrap_or_else(|| std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../out"))
            };
            println!("Serving frontend from: {:?}", frontend_dir);

            tauri::async_runtime::spawn(async move {
                // SPA fallback: serve static files, with pos.html as the fallback for unknown routes
                let pos_fallback = frontend_dir.join("pos.html");
                let spa_fallback = ServeDir::new(frontend_dir)
                    .not_found_service(ServeFile::new(pos_fallback));

                let app = Router::new()
                    .route("/api/v1/health", get(handle_health))
                    .route("/api/v1/reservations", get(handle_get_reservations).post(handle_external_reservation))
                    .route("/api/v1/settings", get(handle_get_settings))
                    .route("/api/v1/rooms", get(handle_get_rooms))
                    .route("/api/v1/notifications", get(handle_get_notifications))
                    .route("/api/v1/products", get(handle_get_products).post(handle_add_product).delete(handle_delete_product))
                    .route("/api/v1/pos_sales", get(handle_get_pos_sales).post(handle_add_pos_sale).patch(handle_update_pos_sale).delete(handle_delete_pos_sale))
                    .route("/api/v1/devices", get(handle_get_devices).delete(handle_delete_device))
                    .route("/api/v1/devices/register", post(handle_register_device))
                    .route("/api/v1/devices/block", post(handle_block_device))
                    .route("/api/v1/guests", get(handle_get_guests).post(handle_add_guest).delete(handle_delete_guest))
                    .route("/api/v1/feedback", get(handle_get_feedback).post(handle_add_feedback).delete(handle_delete_feedback))
                    .route("/api/v1/room_charges", get(handle_get_room_charges).post(handle_add_room_charge))
                    .fallback_service(spa_fallback)
                    .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any).allow_methods(Any))
                    .with_state(state);
 
                let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
                println!("Webhook server listening on http://0.0.0.0:3001");
                axum::serve(listener, app).await.unwrap();
            });
 
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_rooms, 
            get_reservations, 
            get_api_key, 
            update_room_status, 
            add_reservation,
            get_settings,
            get_notifications,
            update_setting,
            add_guest,
            delete_guest,
            add_feedback,
            get_feedback,
            delete_feedback,
            get_products,
            add_product,
            delete_product,
            add_pos_sale,
            get_pos_sales,
            delete_pos_sale,
            update_pos_sale,
            start_cloud_tunnel,
            delete_reservation,
            get_guests,
            add_room_charge,
            get_room_charges,
            get_local_ip,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
