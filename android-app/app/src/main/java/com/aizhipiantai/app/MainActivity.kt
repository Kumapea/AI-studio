package com.aizhipiantai.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var content: LinearLayout
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showHome()
        handleShare(intent)
    }

    override fun onNewIntent(intent: Intent?) { super.onNewIntent(intent); intent?.let { handleShare(it) } }

    private fun showHome() {
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 28, 24, 24) }
        val scroll = ScrollView(this).apply { addView(content) }
        setContentView(scroll)
        addTitle("AI制片台", "你负责说人话，AI负责判断。")
        card("🎬 视频分析", "上传/分享视频 → 分析镜头、人物、情绪、节奏与可复制方法") { pickVideo() }
        card("🔥 爆款拆解", "视频 + 播放/互动数据 → 判断为什么爆") { showGrowth(true) }
        card("📊 我的诊断", "自己的视频 + 传播数据 → 判断为什么好或为什么差") { showGrowth(false) }
        card("✦ AI导演", "一句大白话 → 自动判断情绪、人物关系和怎么拍") { showDirector() }
        val ai = TextView(this).apply { text = "AI大脑：DeepSeek · Kimi · GPT · Gemini\n不需要 API Key；交给网页版 AI 完成真正判断。"; textSize = 14f; setPadding(0, 20, 0, 0) }
        content.addView(ai)
        if (!Settings.canDrawOverlays(this)) {
            button("开启 Android 悬浮按钮") { startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) }
        } else {
            button("启动悬浮按钮 ●") { startService(Intent(this, FloatingBubbleService::class.java)) }
        }
    }

    private fun addTitle(title: String, sub: String) {
        content.addView(TextView(this).apply { text = title; textSize = 30f; setTypeface(null, 1) })
        content.addView(TextView(this).apply { text = sub; textSize = 16f; setPadding(0, 8, 0, 22) })
    }
    private fun card(title: String, sub: String, click: () -> Unit) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; background = getDrawable(com.aizhipiantai.app.R.drawable.card_bg); setPadding(18,18,18,18) }
        box.addView(TextView(this).apply { text=title; textSize=19f; setTypeface(null,1) })
        box.addView(TextView(this).apply { text=sub; textSize=14f; setPadding(0,8,0,0) })
        box.setOnClickListener { click() }
        content.addView(box, LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT).apply { setMargins(0,0,0,14) })
    }
    private fun button(label: String, click: () -> Unit) { val b=Button(this).apply{text=label;setOnClickListener{click()}}; content.addView(b) }

    private fun pickVideo() { startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply { type="video/*"; addCategory(Intent.CATEGORY_OPENABLE) }, 101) }

    private fun showDirector() {
        content.removeAllViews(); addTitle("AI导演", "不用你选景别、运镜、动作，AI自己判断。")
        val input=EditText(this).apply{hint="例如：两个人表面在聊天，但其中一个人知道这是最后一次见面……";minLines=7;gravity=Gravity.TOP}
        content.addView(input)
        button("生成导演任务") { shareTask("你是资深影视导演和AI视频导演。理解下面的大白话，不要反问我，也不要让我选择场景、景别、镜头或运镜。自行判断核心情绪、潜在情绪、人物关系和情绪转折，并使用成熟电影/电视剧通用镜头逻辑完成。\n\n用户描述：${input.text}\n\n输出：核心情绪；最终中文视频Prompt；为什么这样拍；一个最关键导演提醒。") }
        button("返回首页") { showHome() }
    }

    private fun showGrowth(hot: Boolean) {
        content.removeAllViews(); addTitle(if(hot) "爆款拆解" else "我的视频诊断", if(hot) "视频 + 数据 → 判断为什么爆" else "视频 + 数据 → 找真正瓶颈")
        val fields = listOf("播放量","点赞","评论","转发","收藏","完播率 %","平均观看时长 秒","发布时粉丝量")
        val inputs = fields.map { f -> EditText(this).apply { hint=f; inputType=2; content.addView(this) } }
        val note=EditText(this).apply{hint="补充信息（可选）";minLines=3};content.addView(note)
        button(if(hot) "生成爆款拆解任务" else "生成我的诊断任务") {
            val data=fields.zip(inputs).joinToString("；") { "${it.first}:${it.second.text}" }
            val task=if(hot) "你是一名短视频增长导演。请基于上传的视频与真实传播数据做为什么爆的因果拆解。数据：$data。输出：爆款核心机制（最多3条）；前3秒继续观看理由；信息/情绪/冲突/反转关键节点；互动可能触发因素并区分证据与推测；可复制的方法；普通账号最容易失败的地方；给我的下一条视频一个最值得执行的改动。不要复制故事和台词，不要用空话。补充：${note.text}" else "你是一名短视频内容导演+增长分析师。请分析我上传的自己的视频并结合真实传播数据判断为什么结果好或差。数据：$data。严格输出：最大优势/问题只说一个；内容质量 vs 传播效率；前3秒/前10秒/第一次转折/结尾；数据能支持什么判断；最可能流失位置；如果只允许改3处的具体修改；下一条可复制的方法。不要用空话。补充：${note.text}"
            shareTask(task)
        }
        button("返回首页") { showHome() }
    }

    private fun shareTask(task: String) { startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type="text/plain"; putExtra(Intent.EXTRA_TEXT,task) }, "交给 AI")) }

    private fun handleShare(intent: Intent) {
        if (intent.action == Intent.ACTION_SEND && intent.type?.startsWith("video/") == true) {
            Toast.makeText(this, "已接收视频分享。进入视频分析即可继续。", Toast.LENGTH_LONG).show()
        }
    }
}
