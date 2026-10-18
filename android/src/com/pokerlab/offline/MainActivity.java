package com.pokerlab.offline;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.JsResult;
import android.webkit.WebResourceRequest;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
  private WebView web;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    web.setBackgroundColor(Color.rgb(16,24,23));
    setContentView(web);
    WebSettings settings=web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setBlockNetworkLoads(true);
    settings.setMediaPlaybackRequiresUserGesture(true);
    if(Build.VERSION.SDK_INT>=29) settings.setForceDark(WebSettings.FORCE_DARK_OFF);
    if(Build.VERSION.SDK_INT>=33) settings.setAlgorithmicDarkeningAllowed(false);
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,String url) {
        return !url.startsWith("https://appassets.androidplatform.net/");
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){
        new AlertDialog.Builder(MainActivity.this).setMessage(message)
          .setPositiveButton("Aceptar",(d,w)->result.confirm())
          .setNegativeButton("Cancelar",(d,w)->result.cancel())
          .setOnCancelListener(d->result.cancel()).show();return true;
      }
      @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){
        new AlertDialog.Builder(MainActivity.this).setMessage(message)
          .setPositiveButton("Aceptar",(d,w)->result.confirm()).setOnCancelListener(d->result.confirm()).show();return true;
      }
    });
    try(InputStream input=getAssets().open("index.html");ByteArrayOutputStream bytes=new ByteArrayOutputStream()){
      byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)bytes.write(buffer,0,count);
      web.loadDataWithBaseURL("https://appassets.androidplatform.net/",new String(bytes.toByteArray(),StandardCharsets.UTF_8),"text/html","UTF-8",null);
    }catch(Exception error){new AlertDialog.Builder(this).setMessage("No se pudo cargar Poker Lab.").setPositiveButton("Cerrar",(d,w)->finish()).show();}
  }
  @Override protected void onPause(){super.onPause();web.onPause();web.evaluateJavascript("if(typeof audioCtx!=='undefined'&&audioCtx)audioCtx.suspend();",null);}
  @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("if(typeof updateTurnClock==='function'&&typeof turnDeadline!=='undefined'&&turnDeadline)updateTurnClock();if(typeof audioCtx!=='undefined'&&audioCtx&&typeof musicOn!=='undefined'&&musicOn)audioCtx.resume();",null);}}
  @Override public void onBackPressed(){new AlertDialog.Builder(this).setMessage("¿Cerrar Poker Lab? La partida actual no se guarda.").setPositiveButton("Cerrar",(d,w)->finish()).setNegativeButton("Seguir jugando",null).show();}
  @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
