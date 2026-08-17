package ai.sheildx.user

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.app.NotificationCompat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private var triggerEmergencyCallback: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()

        setContent {
            SheildXUserAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    MainAppNavigation(
                        onRegisterWatchTrigger = { callback ->
                            triggerEmergencyCallback = callback
                        },
                        onSendWatchVibrationNotification = { title, message ->
                            sendFireBolttNotification(title, message)
                        }
                    )
                }
            }
        }
    }

    // Fire-Boltt 080 Bluetooth Hardware Button Listener (Camera Shutter / Music Play-Pause)
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE ||
            keyCode == KeyEvent.KEYCODE_MEDIA_NEXT ||
            keyCode == KeyEvent.KEYCODE_CAMERA ||
            keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            
            triggerEmergencyCallback?.invoke()
            sendFireBolttNotification("🚨 EMERGENCY SOS TRIGGERED", "ShieldX alert sent from Fire-Boltt watch!")
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "shieldx_fireboltt_channel",
                "ShieldX Safety Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Sends emergency alerts to Fire-Boltt smartwatch via Bluetooth"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun sendFireBolttNotification(title: String, message: String) {
        try {
            val builder = NotificationCompat.Builder(this, "shieldx_fireboltt_channel")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(1001, builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

@Composable
fun SheildXUserAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF3B82F6),
            secondary = Color(0xFF10B981),
            background = Color(0xFF0F172A),
            surface = Color(0xFF1E293B),
            error = Color(0xFFEF4444)
        ),
        content = content
    )
}

enum class Screen {
    REGISTER,
    JOURNEY_SETUP,
    ACTIVE_JOURNEY,
    PRIVATE_CHECK,
    EMERGENCY_ALERT,
    SETTINGS
}

@Composable
fun MainAppNavigation(
    onRegisterWatchTrigger: (() -> Unit) -> Unit,
    onSendWatchVibrationNotification: (String, String) -> Unit
) {
    var currentScreen by remember { mutableStateOf(Screen.REGISTER) }
    var userEmail by remember { mutableStateOf("user@sheildx.ai") }
    var emergencyEmails by remember { mutableStateOf(listOf("email1@test.com", "email2@test.com", "email3@test.com", "email4@test.com")) }
    var destinationName by remember { mutableStateOf("Home (Main Road)") }
    var etaMinutes by remember { mutableStateOf(25) }
    var voiceCode by remember { mutableStateOf("Blue Jasmine") }

    LaunchedEffect(Unit) {
        onRegisterWatchTrigger {
            currentScreen = Screen.EMERGENCY_ALERT
        }
    }

    when (currentScreen) {
        Screen.REGISTER -> RegisterScreen(
            onRegisterSuccess = { email, emails ->
                userEmail = email
                emergencyEmails = emails
                currentScreen = Screen.JOURNEY_SETUP
            }
        )
        Screen.JOURNEY_SETUP -> JourneySetupScreen(
            userEmail = userEmail,
            emergencyEmails = emergencyEmails,
            voiceCode = voiceCode,
            onStartJourney = { dest, eta ->
                destinationName = dest
                etaMinutes = eta
                currentScreen = Screen.ACTIVE_JOURNEY
            },
            onOpenSettings = { currentScreen = Screen.SETTINGS }
        )
        Screen.ACTIVE_JOURNEY -> ActiveJourneyScreen(
            destinationName = destinationName,
            etaMinutes = etaMinutes,
            voiceCode = voiceCode,
            onTriggerCheck = {
                onSendWatchVibrationNotification("🚨 ARE YOU SAFE?", "Route deviation detected. Tap to confirm safety.")
                currentScreen = Screen.PRIVATE_CHECK
            },
            onTriggerEmergency = {
                onSendWatchVibrationNotification("🚨 EMERGENCY SOS ACTIVE", "Guardians notified via WhatsApp & Email")
                currentScreen = Screen.EMERGENCY_ALERT
            },
            onEndJourney = { currentScreen = Screen.JOURNEY_SETUP }
        )
        Screen.PRIVATE_CHECK -> PrivateCheckOverlayScreen(
            onSafe = { currentScreen = Screen.ACTIVE_JOURNEY },
            onEscalateNo = {
                onSendWatchVibrationNotification("🚨 EMERGENCY ESCALATED", "Live location dispatched to 4 emails & WhatsApp")
                currentScreen = Screen.EMERGENCY_ALERT
            }
        )
        Screen.EMERGENCY_ALERT -> EmergencyAlertScreen(
            emergencyEmails = emergencyEmails,
            onResolve = { currentScreen = Screen.JOURNEY_SETUP }
        )
        Screen.SETTINGS -> VoiceSettingsScreen(
            currentPhrase = voiceCode,
            onSavePhrase = { newPhrase ->
                voiceCode = newPhrase
                currentScreen = Screen.JOURNEY_SETUP
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(onRegisterSuccess: (String, List<String>) -> Unit) {
    var fullName by remember { mutableStateOf("Sarah Jenkins") }
    var email by remember { mutableStateOf("sarah@sheildx.ai") }
    var password by remember { mutableStateOf("securePass123") }
    var phone by remember { mutableStateOf("+1 555-0199") }
    
    var email1 by remember { mutableStateOf("parent1@sheildx.ai") }
    var email2 by remember { mutableStateOf("parent2@sheildx.ai") }
    var email3 by remember { mutableStateOf("guardian3@sheildx.ai") }
    var email4 by remember { mutableStateOf("friend4@sheildx.ai") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("SheildX AI", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
        Text("Fire-Boltt 080 Smartwatch Protection System", fontSize = 14.sp, color = Color.Gray)
        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Create Account", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email Address") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth())
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Registered Emergency Emails (Required: 4)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                Text("Emergency alerts will be automatically dispatched to all 4 contacts", fontSize = 12.sp, color = Color.LightGray)
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(value = email1, onValueChange = { email1 = it }, label = { Text("Emergency Email 1") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = email2, onValueChange = { email2 = it }, label = { Text("Emergency Email 2") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = email3, onValueChange = { email3 = it }, label = { Text("Emergency Email 3") }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = email4, onValueChange = { email4 = it }, label = { Text("Emergency Email 4") }, modifier = Modifier.fillMaxWidth())
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { onRegisterSuccess(email, listOf(email1, email2, email3, email4)) },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
        ) {
            Text("REGISTER & CONTINUE", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun JourneySetupScreen(
    userEmail: String,
    emergencyEmails: List<String>,
    voiceCode: String,
    onStartJourney: (String, Int) -> Unit,
    onOpenSettings: () -> Unit
) {
    var startLocation by remember { mutableStateOf("College Gate 2") }
    var destination by remember { mutableStateOf("Home — Sector 6, Main Road") }
    var eta by remember { mutableStateOf(25) }

    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Fire-Boltt 080 Protection", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("User: $userEmail", fontSize = 12.sp, color = Color.Gray)
            }
            IconButton(onClick = onOpenSettings) {
                Text("⚙️", fontSize = 24.sp)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Start New Journey", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                Spacer(modifier = Modifier.height(12.dp))

                Text("Start Location", fontSize = 12.sp, color = Color.Gray)
                OutlinedTextField(value = startLocation, onValueChange = { startLocation = it }, modifier = Modifier.fillMaxWidth())

                Spacer(modifier = Modifier.height(10.dp))

                Text("Destination Location", fontSize = 12.sp, color = Color.Gray)
                OutlinedTextField(value = destination, onValueChange = { destination = it }, modifier = Modifier.fillMaxWidth())

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Calculated Suggested ETA:", fontSize = 14.sp, color = Color.White)
                    Text("$eta min (10:30 PM)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Color(0xFF334155))
                Spacer(modifier = Modifier.height(12.dp))

                Text("Fire-Boltt Watch Trigger:", fontSize = 13.sp, color = Color.Gray)
                Text("⌚ Press Camera Shutter or Double Play on Watch", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                Spacer(modifier = Modifier.height(6.dp))
                Text("Emergency Voice Code Active:", fontSize = 13.sp, color = Color.Gray)
                Text("🗣️ \"$voiceCode\"", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Emergency Emails Configured (${emergencyEmails.size}):", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                emergencyEmails.forEachIndexed { idx, em ->
                    Text("${idx + 1}. $em", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { onStartJourney(destination, eta) },
            modifier = Modifier.fillMaxWidth().height(54.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
        ) {
            Text("▶ START JOURNEY MONITORING", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ActiveJourneyScreen(
    destinationName: String,
    etaMinutes: Int,
    voiceCode: String,
    onTriggerCheck: () -> Unit,
    onTriggerEmergency: () -> Unit,
    onEndJourney: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(12.dp).background(Color(0xFF10B981), shape = RoundedCornerShape(6.dp))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("JOURNEY ACTIVE", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
            }
            Text("Fire-Boltt 080: Synced ⌚", fontSize = 12.sp, color = Color(0xFF60A5FA))
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Destination:", fontSize = 12.sp, color = Color.Gray)
                Text(destinationName, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)

                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("ETA Remaining", fontSize = 12.sp, color = Color.Gray)
                        Text("$etaMinutes mins", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                    }
                    Column {
                        Text("Route Status", fontSize = 12.sp, color = Color.Gray)
                        Text("NORMAL (On Path)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                    }
                    Column {
                        Text("Watch Sync", fontSize = 12.sp, color = Color.Gray)
                        Text("Active ⚡", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF334155))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Fire-Boltt 080 Hardware Listener:", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                Text("⌚ Press Camera Shutter or Double Play on Watch to trigger SOS", fontSize = 13.sp, color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
        Text("Simulation Controls (Dev / Testing)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
        Spacer(modifier = Modifier.height(8.dp))

        OutlinedButton(
            onClick = onTriggerCheck,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFF59E0B))
        ) {
            Text("Simulate Route Deviation (Check Fire-Boltt Watch Vibration)")
        }

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = onTriggerEmergency,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
        ) {
            Text("Simulate Emergency SOS Trigger")
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onEndJourney,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569))
        ) {
            Text("ARRIVED SAFELY (END JOURNEY)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun PrivateCheckOverlayScreen(onSafe: () -> Unit, onEscalateNo: () -> Unit) {
    var timerSeconds by remember { mutableStateOf(30) }

    LaunchedEffect(timerSeconds) {
        if (timerSeconds > 0) {
            delay(1000)
            timerSeconds--
        } else {
            onEscalateNo()
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xD90F172A)).padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("⌚ Fire-Boltt 080 Watch Vibrating...", fontSize = 14.sp, color = Color(0xFFF59E0B))
                Spacer(modifier = Modifier.height(8.dp))

                Text("ARE YOU SAFE?", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Route deviation detected", fontSize = 14.sp, color = Color.LightGray)

                Spacer(modifier = Modifier.height(20.dp))

                Text("$timerSeconds", fontSize = 48.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                Text("Seconds before automatic emergency escalation", fontSize = 11.sp, color = Color.Gray)

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onSafe,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("YES — I'M SAFE", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onEscalateNo,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("NO — SEND HELP NOW", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun EmergencyAlertScreen(emergencyEmails: List<String>, onResolve: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFF450A0A)).padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("🚨 EMERGENCY ACTIVE", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Fire-Boltt 080 Protection Engaged", fontSize = 13.sp, color = Color(0xFFFECACA))

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Multi-Channel Notifications Dispatched:", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(8.dp))
                Text("✓ FCM Push sent to Guardian App", fontSize = 13.sp, color = Color.White)
                Text("✓ 4 Emergency Emails sent:", fontSize = 13.sp, color = Color.White)
                emergencyEmails.forEach { em ->
                    Text("  • $em", fontSize = 12.sp, color = Color(0xFFFECACA))
                }
                Text("✓ WhatsApp Emergency Alert sent", fontSize = 13.sp, color = Color.White)
                Text("✓ Live GPS tracking stream active", fontSize = 13.sp, color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Current GPS Location:", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                Text("12.9716° N, 77.5946° E (Main Road)", fontSize = 16.sp, color = Color.White)
                Text("Battery: 92% | Network: 5G", fontSize = 13.sp, color = Color.LightGray)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onResolve,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
        ) {
            Text("RESOLVE EMERGENCY & STOP TRACKING", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceSettingsScreen(currentPhrase: String, onSavePhrase: (String) -> Unit) {
    var phrase by remember { mutableStateOf(currentPhrase) }

    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Personal Voice Code Settings", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Personal Emergency Phrase", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                Text("Choose your own emergency phrase. Default example: 'Blue Jasmine'", fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = phrase,
                    onValueChange = { phrase = it },
                    label = { Text("Emergency Voice Phrase") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("• On-device speech recognition active", fontSize = 12.sp, color = Color.LightGray)
                Text("• No raw audio recorded or stored", fontSize = 12.sp, color = Color.LightGray)
                Text("• Triggers immediate emergency alert", fontSize = 12.sp, color = Color.LightGray)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { onSavePhrase(phrase) },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
        ) {
            Text("SAVE VOICE PHRASE", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
