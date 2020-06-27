resource "aws_instance" "kaas-ec2" {
    ami = "ami-0badcc5b522737046" # RHEL8
    instance_type = "t2.micro"
    iam_instance_profile = aws_iam_instance_profile.kaas_profile.name
    subnet_id = aws_subnet.kaas-subnet-public-1.id
    vpc_security_group_ids = [aws_security_group.ssh-allowed.id, aws_security_group.tcp-allowed.id]
    key_name = "first-key-pair"
    user_data = <<-EOF
      #!/bin/bash
      yum install -y nodejs git
      git clone https://github.com/gstefanov-bg/colorflood.git
      cd colorflood
      node server.js "${aws_sqs_queue.kaas-sqs.id}" &
    EOF

    tags = {
      Name = "ColorFlood"
    }
}
