import 'package:flutter/material.dart';

/// Original vector mascot. No network image or external asset is required.
class RobotMascot extends StatefulWidget {
  const RobotMascot({super.key});
  @override State<RobotMascot> createState() => _RobotMascotState();
}
class _RobotMascotState extends State<RobotMascot> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(vsync: this,duration: const Duration(seconds: 3))..repeat(reverse:true);
  @override void dispose(){controller.dispose();super.dispose();}
  @override Widget build(BuildContext context) => Semantics(label:'ILMIGO robot wearing an ILMIGO logo shirt',image:true,child:AnimatedBuilder(animation:controller,builder:(context,child)=>Transform.translate(offset:Offset(0,MediaQuery.disableAnimationsOf(context)?0:-6*Curves.easeInOut.transform(controller.value)),child:child),child:const AspectRatio(aspectRatio:240/270,child:CustomPaint(painter:_RobotPainter()))));
}
class _RobotPainter extends CustomPainter {
  const _RobotPainter();
  @override void paint(Canvas canvas,Size size){
    final scale=(size.width/240).clamp(0.0,double.infinity).toDouble();canvas.save();canvas.scale(scale,size.height/270);
    final paint=Paint();
    void rect(double x,double y,double w,double h,double r,Color c){paint.color=c;canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x,y,w,h),Radius.circular(r)),paint);}
    void circle(double x,double y,double r,Color c){paint.color=c;canvas.drawCircle(Offset(x,y),r,paint);}
    void line(Offset a,Offset b,double width,Color c){paint..color=c..strokeWidth=width..strokeCap=StrokeCap.round;canvas.drawLine(a,b,paint);}
    const shell=Color(0xffe2ebd9),dark=Color(0xff21584f),trim=Color(0xff7fa28e),shirt=Color(0xffe7c472);
    paint.color=const Color(0x17709e7e);canvas.drawOval(const Rect.fromLTWH(58,246,128,14),paint);
    line(const Offset(120,39),const Offset(120,22),6,trim);circle(120,18,8,shirt);
    rect(41,70,20,38,9,trim);rect(179,70,20,38,9,trim);rect(49,39,142,99,35,shell);rect(62,54,116,65,24,dark);
    circle(91,80,9,const Color(0xffc3f5b7));circle(150,80,9,const Color(0xffc3f5b7));circle(94,77,3,Colors.white);circle(153,77,3,Colors.white);
    paint..color=const Color(0xffb9ebbd)..style=PaintingStyle.stroke..strokeWidth=4;canvas.drawArc(const Rect.fromLTWH(108,91,25,20),0.2,2.7,false,paint);paint.style=PaintingStyle.fill;
    rect(103,131,35,16,7,trim);rect(66,144,108,70,16,shirt);
    line(const Offset(73,153),const Offset(51,181),23,shirt);circle(50,187,12,shell);
    line(const Offset(165,153),const Offset(186,163),23,shirt);line(const Offset(186,163),const Offset(209,129),22,shirt);
    line(const Offset(208,128),const Offset(215,110),8,shell);line(const Offset(210,129),const Offset(223,122),8,shell);
    line(const Offset(85,214),const Offset(81,238),19,trim);line(const Offset(155,214),const Offset(160,238),19,trim);
    rect(56,234,43,17,9,shell);rect(141,234,43,17,9,shell);rect(85,165,72,29,6,const Color(0xfffffbe9));
    final text=TextPainter(text:const TextSpan(text:'ILMIGO',style:TextStyle(color:Color(0xff355a4d),fontSize:15,fontWeight:FontWeight.w900,letterSpacing:0.3)),textDirection:TextDirection.ltr)..layout();text.paint(canvas,Offset(121-text.width/2,171));canvas.restore();
  }
  @override bool shouldRepaint(covariant CustomPainter oldDelegate)=>false;
}
