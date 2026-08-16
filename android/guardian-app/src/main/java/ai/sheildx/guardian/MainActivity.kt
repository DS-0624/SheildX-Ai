package ai.sheildx.guardian

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuardianAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    GuardianNavigation()
                }
            }
        }
    }
}

@Composable
fun GuardianAppTheme(content: @Composable () -> Unit) {
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

enum class GuardianScreen {
    DASHBOARD,
    LINK_CHILD,
    LIVE_EMERGENCY
}

@Composable
fun GuardianNavigation() {
    var screen by remember { mutableStateOf(GuardianScreen.DASHBOARD) }
    var emergencyAcknowledged by remember { mutableStateOf(false) }

    when (screen) {
        GuardianScreen.DASHBOARD -> GuardianDashboardScreen(
            onOpenLinkChild = { screen = GuardianScreen.LINK_CHILD },
            onViewEmergency = { screen = GuardianScreen.LIVE_EMERGENCY }
        )
        GuardianScreen.LINK_CHILD -> LinkChildScreen(
            onDone = { screen = GuardianScreen.DASHBOARD }
        )
        GuardianScreen.LIVE_EMERGENCY -> LiveEmergencyTrackingScreen(
            isAcknowledged = emergencyAcknowledged,
            onAcknowledge = { emergencyAcknowledged = true },
            onResolve = {
                emergencyAcknowledged = false
                screen = GuardianScreen.DASHBOARD
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuardianDashboardScreen(onOpenLinkChild: () -> Unit, onViewEmergency: () -> Unit) {
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
                Text("SheildX AI", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                Text("Parent / Guardian Safety Hub", fontSize = 12.sp, color = Color.Gray)
            }
            Button(onClick = onOpenLinkChild) {
                Text("+ Link Child", fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Active Emergency Banner Alert
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🚨 ALERT:", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Sarah Jenkins Needs Help!", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFECACA))
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text("Trigger: Emergency Voice Code ('Blue Jasmine')", fontSize = 13.sp, color = Color.White)
                Text("Time: 2 minutes ago | Battery: 92%", fontSize = 12.sp, color = Color.LightGray)

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onViewEmergency,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("OPEN LIVE EMERGENCY MONITOR", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Connected Children / Wards (1)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Sarah Jenkins", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Phone: +1 555-0199", fontSize = 12.sp, color = Color.Gray)
                    }
                    Text("EMERGENCY 🚨", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Color(0xFF334155))
                Spacer(modifier = Modifier.height(12.dp))

                Text("Active Journey:", fontSize = 12.sp, color = Color.Gray)
                Text("College Gate → Home — Sector 6", fontSize = 14.sp, color = Color.White)
                Text("Watch: Connected (92% Battery) ⌚", fontSize = 12.sp, color = Color(0xFF60A5FA))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LinkChildScreen(onDone: () -> Unit) {
    var code by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Link Child Account", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Enter the 6-digit invitation code generated on the child's app", fontSize = 13.sp, color = Color.Gray)

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = code,
            onValueChange = { if (it.length <= 6) code = it },
            label = { Text("6-Digit Linking Code") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
        ) {
            Text("AUTHORIZE RELATIONSHIP", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun LiveEmergencyTrackingScreen(
    isAcknowledged: Boolean,
    onAcknowledge: () -> Unit,
    onResolve: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFF450A0A)).padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("🚨 LIVE TRACKING", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(if (isAcknowledged) "ACKNOWLEDGED ✓" else "UNACKNOWLEDGED", fontSize = 12.sp, color = if (isAcknowledged) Color(0xFF10B981) else Color(0xFFF59E0B))
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth().weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(
                modifier = Modifier.fillMaxSize().padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("🗺️ Live Map Tracking Stream", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                Spacer(modifier = Modifier.height(8.dp))

                Box(
                    modifier = Modifier.fillMaxWidth().height(180.dp).background(Color(0xFF0F172A), shape = RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("📍 Current Coordinates:", fontSize = 12.sp, color = Color.Gray)
                        Text("12.9716° N, 77.5946° E", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Address: Main Road, Sector 6", fontSize = 13.sp, color = Color(0xFF10B981))
                        Text("Accuracy: 5.0m | Source: Phone GPS", fontSize = 11.sp, color = Color.LightGray)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text("Event Timeline Log:", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(6.dp))
                Text("• 15:50:00 — Emergency Voice Code 'Blue Jasmine' Detected", fontSize = 12.sp, color = Color(0xFFFECACA))
                Text("• 15:50:01 — FCM Push sent to Guardian App", fontSize = 12.sp, color = Color.LightGray)
                Text("• 15:50:01 — 4 Emergency Emails dispatched", fontSize = 12.sp, color = Color.LightGray)
                Text("• 15:50:02 — WhatsApp Emergency Alert sent", fontSize = 12.sp, color = Color.LightGray)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (!isAcknowledged) {
            Button(
                onClick = onAcknowledge,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("ACKNOWLEDGE EMERGENCY", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(10.dp))
        }

        Button(
            onClick = onResolve,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
        ) {
            Text("RESOLVE EMERGENCY & CLOSE", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
