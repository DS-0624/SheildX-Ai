package ai.sheildx.wear

import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WearAppTheme {
                WearMainNavigation(
                    onVibrate = { triggerVibration() }
                )
            }
        }
    }

    private fun triggerVibration() {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            if (vibrator.hasVibrator()) {
                val pattern = longArrayOf(0, 500, 200, 500)
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

@Composable
fun WearAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = Colors(
            primary = Color(0xFF3B82F6),
            secondary = Color(0xFF10B981),
            background = Color(0xFF000000),
            surface = Color(0xFF1E293B),
            error = Color(0xFFEF4444)
        ),
        content = content
    )
}

enum class WearScreen {
    HOME,
    ACTIVE_JOURNEY,
    PRIVATE_CHECK,
    EMERGENCY_ACTIVE
}

@Composable
fun WearMainNavigation(onVibrate: () -> Unit) {
    var currentScreen by remember { mutableStateOf(WearScreen.ACTIVE_JOURNEY) }
    var checkCount by remember { mutableStateOf(1) }

    when (currentScreen) {
        WearScreen.HOME -> WearHomeScreen(
            onStartJourney = { currentScreen = WearScreen.ACTIVE_JOURNEY }
        )
        WearScreen.ACTIVE_JOURNEY -> WearActiveJourneyScreen(
            onSimulateDeviation = {
                onVibrate()
                currentScreen = WearScreen.PRIVATE_CHECK
            },
            onManualSOS = {
                onVibrate()
                currentScreen = WearScreen.EMERGENCY_ACTIVE
            }
        )
        WearScreen.PRIVATE_CHECK -> WearPrivateCheckScreen(
            checkCount = checkCount,
            onSafe = {
                checkCount = 1
                currentScreen = WearScreen.ACTIVE_JOURNEY
            },
            onEscalate = {
                onVibrate()
                currentScreen = WearScreen.EMERGENCY_ACTIVE
            },
            onTimeoutNextCheck = {
                if (checkCount < 3) {
                    checkCount++
                    onVibrate()
                } else {
                    // Check #3 timeout -> AUTO ESCALATE TO EMERGENCY
                    onVibrate()
                    currentScreen = WearScreen.EMERGENCY_ACTIVE
                }
            }
        )
        WearScreen.EMERGENCY_ACTIVE -> WearEmergencyScreen(
            onResolve = {
                checkCount = 1
                currentScreen = WearScreen.ACTIVE_JOURNEY
            }
        )
    }
}

@Composable
fun WearHomeScreen(onStartJourney: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("SafeCircle", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
            Text("Watch Connected", fontSize = 10.sp, color = Color.Gray)
            Spacer(modifier = Modifier.height(10.dp))
            Button(
                onClick = onStartJourney,
                modifier = Modifier.size(width = 120.dp, height = 40.dp),
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF10B981))
            ) {
                Text("Start Journey", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun WearActiveJourneyScreen(onSimulateDeviation: () -> Unit, onManualSOS: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black).padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("📍 JOURNEY ACTIVE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
            Spacer(modifier = Modifier.height(4.dp))
            Text("Home (Main Rd)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White, textAlign = TextAlign.Center)
            Text("ETA: 25 mins | 92% 🔋", fontSize = 10.sp, color = Color.LightGray)

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onSimulateDeviation,
                modifier = Modifier.fillMaxWidth(0.85f).height(32.dp),
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF334155))
            ) {
                Text("Simulate Deviation", fontSize = 10.sp)
            }

            Spacer(modifier = Modifier.height(4.dp))

            Button(
                onClick = onManualSOS,
                modifier = Modifier.fillMaxWidth(0.85f).height(36.dp),
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFFEF4444))
            ) {
                Text("🚨 SOS TAP", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun WearPrivateCheckScreen(
    checkCount: Int,
    onSafe: () -> Unit,
    onEscalate: () -> Unit,
    onTimeoutNextCheck: () -> Unit
) {
    var timerSeconds by remember { mutableStateOf(30) }

    LaunchedEffect(timerSeconds, checkCount) {
        if (timerSeconds > 0) {
            delay(1000)
            timerSeconds--
        } else {
            // 30s timeout
            onTimeoutNextCheck()
            timerSeconds = 30
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xFF1E1B4B)).padding(6.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("CHECK #$checkCount / 3", fontSize = 10.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
            Text("ARE YOU SAFE?", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)

            Spacer(modifier = Modifier.height(2.dp))
            Text("$timerSecondss", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))

            Spacer(modifier = Modifier.height(6.dp))

            Row(modifier = Modifier.fillMaxWidth(0.9f), horizontalArrangement = Arrangement.SpaceBetween) {
                Button(
                    onClick = onSafe,
                    modifier = Modifier.size(width = 65.dp, height = 36.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF10B981))
                ) {
                    Text("YES", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = onEscalate,
                    modifier = Modifier.size(width = 65.dp, height = 36.dp),
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFFEF4444))
                ) {
                    Text("NO", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun WearEmergencyScreen(onResolve: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xFF7F1D1D)).padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🚨 EMERGENCY", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Guardians & 4 Emails Notified", fontSize = 9.sp, color = Color(0xFFFECACA), textAlign = TextAlign.Center)

            Spacer(modifier = Modifier.height(10.dp))
            Text("Live GPS Active 📡", fontSize = 11.sp, color = Color.White)

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onResolve,
                modifier = Modifier.fillMaxWidth(0.85f).height(34.dp),
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF1E293B))
            ) {
                Text("Resolve Event", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
