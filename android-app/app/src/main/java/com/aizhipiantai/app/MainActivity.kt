package com.aizhipiantai.app

import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    private lateinit var root: LinearLayout
    private val prefs by lazy { getSharedPreferences("research", Context.MODE_PRIVATE) }
    private var pendingUri: String? = null
    private var pendingText: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIncoming(intent)
        showHome()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIncoming(intent)
        showResearchForm()
    }

    private fun handleIncoming(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND) {
            pendingUri = intent.getParcelableExtra(Intent.EXTRA_STREAM)?.toString()
            pendingText = intent.getStringExtra(Intent.EXTRA_TEXT)
        }
    }

    private fun showHome() {
        base("首页")
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.logo)
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
        root.addView(logo, LinearLayout.LayoutParams(76, 76).apply { bottomMargin = 12 })
        addText("AI制片台", 30f, true)
        addText("研究别人，最后变成自己的创作判断。", 16f, false, 0xFF666666.toInt(), 6)
        addDividerSpace(18)

        bigCard("记录值得研究的视频", "看到一个好视频，不必先下载。先把它变成研究对象：链接、作者、标题、公开数据和你的判断。") { showResearchForm() }
        bigCard("研究库", "只保存你主动判断“值得研究”的视频，不把普通收藏和工作研究混在一起。") { showLibrary() }
        bigCard("本周创作雷达", "看这一周你主动研究了什么，提炼反复出现的机制，并生成下一步创作方向。") { showRadar() }

        addDividerSpace(10)
        val bubbleLabel = if (Settings.canDrawOverlays(this)) "悬浮研究按钮：已开启" else "开启刷视频时的悬浮研究按钮"
        button(bubbleLabel) {
            if (!Settings.canDrawOverlays(this)) {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            } else {
                startService(Intent(this, FloatingBubbleService::class.java))
                toast("悬浮按钮已启动")
            }
        }
        addText("AI大脑：DeepSeek · Kimi · GPT · Gemini\n当前版本以“研究对象”本地归档为主；深度拉片可继续交给拉片片场。", 13f, false, 0xFF888888.toInt(), 16)
    }

    private fun showResearchForm() {
        base("新研究")
        addText("把这个视频先记下来", 25f, true)
        addText("不用一次做完分析。先保存研究对象，周末再深入拉片。", 14f, false, 0xFF666666.toInt(), 4)

        val title = edit("视频标题 / 你给它起的名字", pendingText ?: "")
        val author = edit("作者（可选）", "")
        val link = edit("原视频链接", pendingText ?: "")
        val metrics = edit("公开数据（点赞 / 评论 / 收藏 / 转发）", "")
        val note = edit("你为什么觉得它值得研究？", "")

        addText("状态：🟡 已发现", 13f, false, 0xFF777777.toInt(), 4)
        button("保存到研究库", true) {
            val obj = JSONObject()
            obj.put("title", title.text.toString().trim())
            obj.put("author", author.text.toString().trim())
            obj.put("link", link.text.toString().trim().ifEmpty { pendingUri ?: "" })
            obj.put("metrics", metrics.text.toString().trim())
            obj.put("note", note.text.toString().trim())
            obj.put("createdAt", System.currentTimeMillis())
            obj.put("state", "已发现")
            saveRecord(obj)
            toast("已保存到研究库")
            showLibrary()
        }
        button("打开原视频") {
            val u = link.text.toString().trim().ifEmpty { pendingUri ?: "" }
            if (u.isEmpty()) toast("还没有原视频链接") else runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) }
        }
        button("返回首页") { showHome() }
    }

    private fun showLibrary() {
        base("研究库")
        val records = loadRecords()
        addText("我的研究库", 25f, true)
        addText("主动研究 ≠ 普通收藏。这里的每一条都应该能回到原视频，也能继续深入拉片。", 14f, false, 0xFF666666.toInt(), 4)
        addDividerSpace(10)
        if (records.length() == 0) {
            addText("还没有研究对象。\n刷到值得研究的视频时，点悬浮按钮或“记录值得研究的视频”。", 15f, false, 0xFF777777.toInt(), 20)
        } else {
            for (i in 0 until records.length()) {
                val obj = records.getJSONObject(i)
                val card = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    background = getDrawable(R.drawable.card_bg)
                    setPadding(18,18,18,18)
                }
                val title = obj.optString("title").ifEmpty { "未命名视频" }
                val date = formatTime(obj.optLong("createdAt"))
                addTo(card, title, 18f, true, 0xFF111111.toInt(), 0)
                addTo(card, "${obj.optString("author").ifEmpty { "未知作者" }}  ·  $date", 12f, false, 0xFF777777.toInt(), 4)
                addTo(card, "公开数据：${obj.optString("metrics").ifEmpty { "未填写" }}", 13f, false, 0xFF555555.toInt(), 8)
                val note = obj.optString("note")
                if (note.isNotEmpty()) addTo(card, "你的判断：$note", 13f, false, 0xFF333333.toInt(), 6)
                addTo(card, "🟡 已发现", 12f, false, 0xFF8A6A00.toInt(), 8)
                val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.END }
                val open = smallButton("打开原视频")
                open.setOnClickListener {
                    val u = obj.optString("link")
                    if (u.isEmpty()) toast("这个记录没有保存链接") else runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) }
                }
                val deep = smallButton("深入拉片")
                deep.setOnClickListener { showDeep(obj) }
                actions.addView(open); actions.addView(deep)
                card.addView(actions)
                root.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 12 })
            }
        }
        button("＋继续记录", true) { showResearchForm() }
        button("返回首页") { showHome() }
    }

    private fun showDeep(obj: JSONObject) {
        base("深入拉片")
        addText("下一步：深入拉片", 25f, true)
        addText("研究对象已经保存。接下来把原视频送进“拉片片场”做逐帧分析，再把它的帧图/分析包交给 GPT、DeepSeek 或 Kimi 做因果拆解。", 15f, false, 0xFF555555.toInt(), 10)
        infoCard("视频", obj.optString("title").ifEmpty { "未命名视频" })
        infoCard("链接", obj.optString("link").ifEmpty { "未保存" })
        infoCard("状态", "🔵 待深入拉片")
        button("打开原视频") {
            val u=obj.optString("link")
            if(u.isEmpty()) toast("没有原视频链接") else runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) }
        }
        button("生成给 AI 的研究任务") {
            val task = "请把这个短视频当作一个值得研究的样本。不要复述故事，而是判断为什么它可能有效。请区分证据和推测，并输出：前3秒继续观看理由、第一次信息变化、情绪/冲突节点、节奏与镜头机制、结尾机制、可复制机制，以及最值得转化到我下一条视频的一处改动。\n\n视频：${obj.optString("title")}\n原链接：${obj.optString("link")}\n公开数据：${obj.optString("metrics")}\n我的备注：${obj.optString("note")}"
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type="text/plain"; putExtra(Intent.EXTRA_TEXT,task) }, "交给 AI"))
        }
        button("返回研究库") { showLibrary() }
    }

    private fun showRadar() {
        base("本周创作雷达")
        val records = loadRecords()
        val now = System.currentTimeMillis()
        val week = mutableListOf<JSONObject>()
        for (i in 0 until records.length()) {
            val item = records.getJSONObject(i)
            if (now - item.optLong("createdAt") <= 7L * 24 * 3600 * 1000) week.add(item)
        }
        addText("本周创作雷达", 25f, true)
        addText("只统计你主动保存进研究库的视频。", 14f, false, 0xFF666666.toInt(), 4)
        infoCard("本周主动研究", "${week.size} 条")
        val authors = week.map { it.optString("author") }.filter { it.isNotBlank() }.distinct().size
        infoCard("涉及作者", "$authors 个")
        val notes = week.map { it.optString("note") }.filter { it.isNotBlank() }
        infoCard("你的观察", if(notes.isEmpty()) "还没有足够备注，继续积累研究对象" else notes.take(3).joinToString("；"))
        addText("后续版本会在这里把研究历史真正汇总成：高频机制 → 你最近反复感兴趣的方向 → 1～3个下一条值得试的创作方向，并能回链到对应视频。", 14f, false, 0xFF777777.toInt(), 16)
        button("查看研究库") { showLibrary() }
        button("返回首页") { showHome() }
    }

    private fun base(title: String) {
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(22, 20, 22, 24); setBackgroundColor(0xFFFFFFFF.toInt()) }
        val scroll = ScrollView(this).apply { addView(root) }
        setContentView(scroll)
        val top = LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL; gravity=Gravity.CENTER_VERTICAL }
        val logo = ImageView(this).apply { setImageResource(R.drawable.logo); scaleType=ImageView.ScaleType.CENTER_INSIDE }
        top.addView(logo, LinearLayout.LayoutParams(38,38).apply{rightMargin=10})
        val tv=TextView(this).apply{ text=title; textSize=17f; setTypeface(null,Typeface.BOLD); setTextColor(0xFF111111.toInt()) }
        top.addView(tv)
        root.addView(top, LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=20})
    }

    private fun addText(text: String,size:Float,bold:Boolean,color:Int=0xFF111111.toInt(),topMargin:Int=0){ addTo(root,text,size,bold,color,topMargin) }
    private fun addTo(parent:LinearLayout,text:String,size:Float,bold:Boolean,color:Int,topMargin:Int){ val tv=TextView(this).apply{this.text=text;textSize=size;setTextColor(color);if(bold)setTypeface(null,Typeface.BOLD);setPadding(0,0,0,0)};parent.addView(tv,LinearLayout.LayoutParams(-1,-2).apply{if(topMargin>0)this.topMargin=topMargin;bottomMargin=6}) }
    private fun addDividerSpace(dp:Int){ root.addView(Space(this),LinearLayout.LayoutParams(1,dp)) }
    private fun bigCard(title:String,sub:String,click:()->Unit){ val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;background=getDrawable(R.drawable.card_bg);setPadding(18,18,18,18);setOnClickListener{click()}};addTo(box,title,19f,true,0xFF111111.toInt(),0);addTo(box,sub,14f,false,0xFF555555.toInt(),6);root.addView(box,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=12}) }
    private fun infoCard(k:String,v:String){ val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;background=getDrawable(R.drawable.card_bg);setPadding(16,14,16,14)};addTo(box,k,12f,false,0xFF777777.toInt(),0);addTo(box,v,14f,true,0xFF222222.toInt(),4);root.addView(box,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=9}) }
    private fun edit(hint:String,value:String):EditText{ val e=EditText(this).apply{this.hint=hint;setText(value);textSize=14f;setSingleLine(false);setPadding(14,12,14,12)};root.addView(e,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=10});return e }
    private fun button(label:String,primary:Boolean=false,click:()->Unit){ val b=Button(this).apply{text=label;isAllCaps=false;setOnClickListener{click()};if(primary){setTypeface(null,Typeface.BOLD)}};root.addView(b,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=9}) }
    private fun smallButton(label:String):Button=Button(this).apply{text=label;isAllCaps=false;setTextSize(12f)}

    private fun loadRecords():JSONArray{ return runCatching{JSONArray(prefs.getString("records","[]"))}.getOrElse{JSONArray()} }
    private fun saveRecord(obj:JSONObject){ val a=loadRecords();a.put(0,obj);prefs.edit().putString("records",a.toString()).apply() }
    private fun formatTime(ms:Long):String=if(ms>0)SimpleDateFormat("MM-dd HH:mm",Locale.getDefault()).format(Date(ms)) else "未知时间"
    private fun toast(s:String){Toast.makeText(this,s,Toast.LENGTH_SHORT).show()}
}
